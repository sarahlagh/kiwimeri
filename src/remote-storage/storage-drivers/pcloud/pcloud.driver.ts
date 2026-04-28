import { DriverFileInfo } from '@/remote-storage/sync-types';
import { CloudStorageDriver } from '../abstract.driver';
import {
  PCloudLinkResponse,
  PCloudListResponse,
  PCloudResponse,
  PCloudResult,
  PCloudUploadResponse
} from './types';

export type PCloudConf = {
  token: string;
  username: string;
  password: string;
  serverLocation: 'us' | 'eu';
  path?: string;
  folderid?: string;
};

export class PCloudDriver extends CloudStorageDriver {
  private proxy?: string;
  private config: PCloudConf | null = null;
  private serverUrl!: string;

  private api = {
    us: 'api.pcloud.com',
    eu: 'eapi.pcloud.com'
  };

  public constructor() {
    super('pcloud');
  }

  public getConfig(): PCloudConf | null {
    return this.config;
  }

  public configure(config: PCloudConf, proxy?: string, useHttp?: boolean) {
    this.config = config;
    if (!this.config.folderid && !this.config.path) {
      this.config.path = '/';
    }
    const protocol = useHttp ? 'http' : 'https';
    this.serverUrl = `${protocol}://${this.api[this.config.serverLocation]}`;
    this.proxy = proxy;
    if (proxy) {
      if (proxy.endsWith('/')) {
        this.proxy = proxy.substring(0, proxy.length - 1);
      }
      this.serverUrl = `${this.proxy}/${this.serverUrl}`;
    }
    console.log('[pCloud] server url', this.serverUrl);
    console.log('[pCloud] client configured', {
      ...this.config,
      token: '*******',
      password: '*******'
    });
  }

  public async fetchFilesInfo(names: string[]) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    let filesInfo: DriverFileInfo[] = [];
    let res: PCloudListResponse | null;
    if (!this.config.folderid) {
      res = await this.getFetch<PCloudListResponse>('listfolder', {
        path: this.config.path
      });
    } else {
      res = await this.getFetch<PCloudListResponse>('listfolder', {
        folderid: this.config.folderid
      });
    }
    if (!res || res.result !== PCloudResult.ok) {
      console.error('[pCloud] error:', res);
      return { success: false, filesInfo };
    }
    this.config.folderid = `${res.metadata!.folderid!}`;
    if (res.metadata?.contents) {
      filesInfo = res.metadata.contents
        .filter(f => !f.isfolder && names.find(name => f.name.match(name)))
        .map(f => ({
          providerid: `${f.fileid}`,
          filename: f.name,
          size: f.size,
          hash: `${f.hash}`,
          updated: this.parseDate(f.modified)
        }));
    }
    console.log('[pCloud] connection tested OK');
    return { success: true, filesInfo };
  }

  public async fileExists(
    filename: string
  ): Promise<{ success: boolean; exists?: boolean }> {
    if (!this.config || !this.config.folderid) {
      throw new Error('uninitialized pcloud config');
    }
    const res = await this.getFetch<PCloudListResponse>('stat', {
      path: `${this.config.path}/${filename}`
    });
    if (!res) return { success: false };
    if (res.result === 0 && res.metadata) {
      return { success: true, exists: true };
    }
    if (res.result === PCloudResult.fileNotFound) {
      return { success: true, exists: false };
    }
    return { success: false };
  }

  public async getFileInfo(
    filename: string
  ): Promise<{ success: boolean; fileInfo?: DriverFileInfo }> {
    if (!this.config || !this.config.folderid) {
      throw new Error('uninitialized pcloud config');
    }
    const res = await this.getFetch<PCloudListResponse>('stat', {
      path: `${this.config.path}/${filename}`
    });
    if (res && res.result === 0 && res.metadata) {
      const f = res.metadata;
      return {
        success: true,
        fileInfo: {
          providerid: `${f.fileid}`,
          filename: f.name,
          size: f.size,
          hash: `${f.hash}`,
          updated: this.parseDate(f.modified)
        }
      };
    }
    return { success: false };
  }

  public async pushFile(filename: string, content: string) {
    if (!this.config || !this.config.folderid) {
      throw new Error('uninitialized pcloud config');
    }
    console.log('[pCloud] uploading file', filename);
    const resp = await this.uploadFile(content, filename, this.config.folderid);
    if (
      !resp ||
      resp.result !== PCloudResult.ok ||
      resp.metadata.length === 0
    ) {
      console.error('[pCloud] error uploading changes');
      // TODO handle error
      return { success: false };
    }
    const f = resp.metadata[0];
    console.log('[pCloud] file upload success', filename);
    return {
      success: true,
      driverInfo: {
        providerid: `${f.fileid}`,
        filename: `${f.name}`,
        hash: `${f.hash}`,
        updated: this.parseDate(f.modified)
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async pullFile(providerid: string, filename: string) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    return this.downloadFile(providerid);
  }

  public async renameFile(
    providerid: string,
    filename: string,
    newFilename: string
  ): Promise<{ success: boolean }> {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    let res: PCloudListResponse | null = null;
    if (providerid) {
      res = await this.getFetch<PCloudListResponse>('renamefile', {
        fileid: providerid,
        toname: newFilename
      });
    } else if (filename) {
      res = await this.getFetch<PCloudListResponse>('renamefile', {
        path: `${this.config.path}/${filename}`,
        toname: newFilename
      });
    }
    if (res && newFilename === res.metadata?.name) {
      return { success: true };
    }
    return { success: false };
  }

  public async close() {
    // no impl
  }

  private async downloadFile(fileid: string) {
    console.log('[pCloud] fetching file link', fileid);
    const res = await this.getFetch<PCloudLinkResponse>('getfilelink', {
      fileid: fileid,
      skipfilename: '1'
    });
    if (!res || res.error) {
      console.error('[pCloud] unable to fetch file link', res);
      return { success: false };
    }
    const linkUrl = `https://${res.hosts[0]}${res.path}`;
    const url = this.proxy ? `${this.proxy}/${linkUrl}` : linkUrl;
    // download file content
    console.log('[pCloud] downloading file', fileid);
    const data = await fetch(url);
    const content = await data.json();
    console.log('[pCloud] file download success', fileid);
    return { content: JSON.stringify(content), success: true };
  }

  private async uploadFile(
    content: string,
    filename: string,
    folderid: string
  ) {
    const res = await fetch(
      `${this.getUrl('uploadfile')}&folderid=${folderid}&filename=${filename}&nopartial=1`,
      {
        method: 'PUT',
        body: content,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).catch(e => {
      console.error(e);
      return null;
    });
    if (!res) return null;
    return (await res.json()) as PCloudUploadResponse;
  }

  public async deleteFile(providerid: string, filename: string) {
    console.log('[pCloud] deleting file', providerid, filename);
    if (filename) {
      const res = await this.getFetch<PCloudResponse>('deletefile', {
        path: `${this.config?.path || ''}/${filename}`
      });
      if (!res || res.error) {
        console.error('[pCloud] error deleting file:', filename, res?.error);
        return { success: false };
      }
    } else if (providerid) {
      const res = await this.getFetch<PCloudResponse>('deletefile', {
        fileid: providerid
      });
      if (!res || res.error) {
        console.error('[pCloud] error deleting file:', providerid, res?.error);
        return { success: false };
      }
    }
    console.log('[pCloud] delete file success', providerid, filename);
    return { success: true };
  }

  private async getFetch<T>(
    opName: string,
    params?: {
      path?: string;
      fileid?: string;
      folderid?: string;
      skipfilename?: string;
      name?: string;
      toname?: string;
    }
  ): Promise<T | null> {
    const path = params?.path ? `&path=${params?.path}` : '';
    const fileid = params?.fileid ? `&fileid=${params?.fileid}` : '';
    const folderid = params?.folderid ? `&folderid=${params?.folderid}` : '';
    const name = params?.name ? `&name=${params?.name}` : '';
    const toname = params?.toname ? `&toname=${params?.toname}` : '';
    const skipfilename = params?.skipfilename
      ? `&skipfilename=${params?.skipfilename}`
      : '';
    const res = await fetch(
      `${this.getUrl(opName)}${fileid}${folderid}${path}${name}${skipfilename}${toname}`
    ).catch(e => {
      console.error(e);
      return null;
    });
    if (!res) return null;
    return (await res.json()) as T;
  }

  private getUrl(opName: string) {
    // return `${this.serverUrl}/${opName}?username=${this.config!.username}&password=${this.config!.password}`;
    return `${this.serverUrl}/${opName}?auth=${this.config!.token}`;
  }

  private parseDate(modified: string) {
    return new Date(modified).getTime() + 1000;
  }
}
