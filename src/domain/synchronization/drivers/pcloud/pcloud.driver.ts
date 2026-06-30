import { CloudStorageDriver } from '../abstract.driver';
import { DriverFileInfo, FileReference } from '../model';
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

  public async fetchFilesInfo(fileRefs: FileReference[]) {
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
        .filter(
          f => !f.isfolder && fileRefs.some(ref => f.name === ref.filename)
        )
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
    fileRef: FileReference
  ): Promise<{ success: boolean; exists?: boolean }> {
    if (!this.config || !this.config.folderid) {
      throw new Error('uninitialized pcloud config');
    }
    const res = await this.getFetch<PCloudListResponse>('stat', {
      path: `${this.config.path}/${fileRef.filename}`
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
    fileRef: FileReference
  ): Promise<{ success: boolean; fileInfo?: DriverFileInfo }> {
    if (!this.config || !this.config.folderid) {
      throw new Error('uninitialized pcloud config');
    }
    const res = await this.getFetch<PCloudListResponse>('stat', {
      path: `${this.config.path}/${fileRef.filename}`
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

  public async pushFile(fileRef: FileReference, content: string) {
    if (!this.config || !this.config.folderid) {
      throw new Error('uninitialized pcloud config');
    }
    console.log('[pCloud] uploading file', fileRef.filename);
    const resp = await this.uploadFile(
      content,
      fileRef.filename,
      this.config.folderid
    );
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
    console.log('[pCloud] file upload success', fileRef.filename);
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

  public async pullFile(fileRef: FileReference) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    if (!fileRef.providerid) {
      throw new Error('[pCloud] missing fileid for download');
    }
    return this.downloadFile(fileRef.providerid);
  }

  public async renameFile(fileRef: FileReference, newFilename: string) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    let res: PCloudListResponse | null = null;
    if (fileRef.providerid) {
      res = await this.getFetch<PCloudListResponse>('renamefile', {
        fileid: fileRef.providerid,
        toname: newFilename
      });
    } else {
      res = await this.getFetch<PCloudListResponse>('renamefile', {
        path: `${this.config.path}/${fileRef.filename}`,
        toname: newFilename
      });
    }
    if (res && newFilename === res.metadata?.name) {
      const f = res.metadata;
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

  public async deleteFile(fileRef: FileReference) {
    console.log('[pCloud] deleting file', fileRef.filename);
    if (fileRef.providerid) {
      const res = await this.getFetch<PCloudResponse>('deletefile', {
        fileid: fileRef.providerid
      });
      if (!res || res.error) {
        console.error(
          '[pCloud] error deleting file:',
          fileRef.providerid,
          res?.error
        );
        return { success: false };
      }
    } else {
      const res = await this.getFetch<PCloudResponse>('deletefile', {
        path: `${this.config?.path || ''}/${fileRef.filename}`
      });
      if (!res || res.error) {
        console.error(
          '[pCloud] error deleting file:',
          fileRef.filename,
          res?.error
        );
        return { success: false };
      }
    }
    console.log('[pCloud] delete file success', fileRef.filename);
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
