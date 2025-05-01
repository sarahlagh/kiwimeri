import { DriverFileInfo, FileStorageDriver } from '@/remote-storage/sync-types';
import {
  PCloudLinkResponse,
  PCloudListResponse,
  PCloudResponse,
  PCloudResult,
  PCloudUploadResponse
} from './types';

export type PCloudConf = {
  username: string;
  password: string;
  serverLocation: 'us' | 'eu';
  path?: string;
  folderid?: string;
};

export class PCloudDriver extends FileStorageDriver {
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
      password: '*******'
    });
  }

  public async fetchFilesInfo(names: string[]) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    let filesInfo: DriverFileInfo[] = [];
    let res: PCloudListResponse;
    if (!this.config.folderid) {
      res = await this.getFetch<PCloudListResponse>('listfolder', {
        path: this.config.path
      });
    } else {
      res = await this.getFetch<PCloudListResponse>('listfolder', {
        folderid: this.config.folderid
      });
    }
    if (res.result !== PCloudResult.ok) {
      console.error('[pCloud] error:', res);
      return { connected: false, filesInfo };
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
          updated: new Date(f.modified).getTime()
        }));
    }
    console.log('[pCloud] connection tested OK');
    return { connected: true, filesInfo };
  }

  public async pushFile(filename: string, content: string) {
    if (!this.config || !this.config.folderid) {
      throw new Error('uninitialized pcloud config');
    }
    const resp = await this.uploadFile(content, filename, this.config.folderid);
    if (resp.result !== PCloudResult.ok || resp.metadata.length === 0) {
      console.log('[pCloud] error uploading changes');
      // TODO handle error
    }
    const f = resp.metadata[0];
    return {
      providerid: `${f.fileid}`,
      filename: `${f.name}`,
      hash: `${f.hash}`,
      updated: new Date(f.modified).getTime()
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async pullFile(providerid: string, filename: string) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    return this.downloadFile(providerid);
  }

  private async downloadFile(fileid: string) {
    console.log('[pCloud] fetching file link');
    const res = await this.getFetch<PCloudLinkResponse>('getfilelink', {
      fileid: fileid,
      skipfilename: '1'
    });
    if (res.error) {
      console.log('[pCloud] unable to fetch file link', res);
      return {};
    }
    const linkUrl = `https://${res.hosts[0]}${res.path}`;
    const url = this.proxy ? `${this.proxy}/${linkUrl}` : linkUrl;
    // download file content
    console.log('[pCloud] downloading file');
    const data = await fetch(url);
    const content = await data.json();
    return { content: JSON.stringify(content) };
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
    );
    return (await res.json()) as PCloudUploadResponse;
  }

  public async deleteFile(providerid: string, filename: string) {
    if (filename) {
      const res = await this.getFetch<PCloudResponse>('deletefile', {
        path: `${this.config?.path || ''}/${filename}`
      });
      if (res.error) {
        console.error('error deleting file:', filename, res.error);
      }
    } else if (providerid) {
      const res = await this.getFetch<PCloudResponse>('deletefile', {
        fileid: providerid
      });
      if (res.error) {
        console.error('error deleting file:', providerid, res.error);
      }
    }
  }

  private async getFetch<T>(
    opName: string,
    params?: {
      path?: string;
      fileid?: string;
      folderid?: string;
      skipfilename?: string;
      name?: string;
    }
  ) {
    const path = params?.path ? `&path=${params?.path}` : '';
    const fileid = params?.fileid ? `&fileid=${params?.fileid}` : '';
    const folderid = params?.folderid ? `&folderid=${params?.folderid}` : '';
    const name = params?.name ? `&name=${params?.name}` : '';
    const skipfilename = params?.skipfilename
      ? `&skipfilename=${params?.skipfilename}`
      : '';
    const res = await fetch(
      `${this.getUrl(opName)}${fileid}${folderid}${path}${name}${skipfilename}`
    );
    return (await res.json()) as T;
  }

  private getUrl(opName: string) {
    return `${this.serverUrl}/${opName}?username=${this.config!.username}&password=${this.config!.password}`;
  }
}
