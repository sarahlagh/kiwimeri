import { KMStorageProvider } from '@/storage-providers/sync-core';
import {
  PCloudLinkResponse,
  PCloudListResponse,
  PCloudResult,
  PCloudUploadResponse
} from './types';

export type PCloudConf = {
  username: string;
  password: string;
  serverLocation: 'us' | 'eu';
  path?: string;
  folderid?: string;
  fileid?: string;
};

class KMPCloudClient implements KMStorageProvider {
  private proxy?: string;
  private config: PCloudConf | null = null;
  private isInit = false;
  private serverUrl!: string;
  private filename!: string;
  private remoteLastModified: number = 0;

  private api = {
    us: 'api.pcloud.com',
    eu: 'eapi.pcloud.com'
  };

  public getIsInit() {
    return this.isInit;
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

  public async test() {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    const ok = await fetch(this.getUrl('userinfo'))
      .catch(res => {
        console.error('[pCloud] error', res);
        return false;
      })
      .then(() => true);

    if (ok) {
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
        return false;
      }
      this.config.folderid = `${res.metadata!.folderid!}`;
      if (res.metadata?.contents) {
        const file = res.metadata.contents.find(
          content => content.name === this.filename
        );
        if (file) {
          this.config.fileid = `${file.fileid}`;
          // TODO: timezone consideration here?
          this.remoteLastModified = new Date(file.modified).getTime();
        }
      }
    }
    console.log('[pCloud] connection tested OK');
    return ok;
  }

  public async init(spaceId: string) {
    this.isInit = false;
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    this.filename = `kiwimeri-${spaceId}.json`;

    const ok = await this.test();

    console.log('[pCloud] client initialized', {
      ...this.config,
      password: '*******'
    });
    this.isInit = ok;
    return {
      test: ok,
      config: this.config,
      lastRemoteChange: this.remoteLastModified
    };
  }

  public async push(content: string) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    const resp = await this.uploadFile(content, this.filename);
    console.log('[pCloud] uploaded changes', resp);
    if (resp.result !== PCloudResult.ok || resp.metadata.length === 0) {
      console.log('[pCloud] error uploading changes');
      // TODO handle error
      return this.remoteLastModified;
    }
    if (!this.config.fileid) {
      this.config.fileid = `${resp.fileids[0]}`;
    }
    this.remoteLastModified = new Date(resp.metadata[0].modified).getTime();
    return this.remoteLastModified;
  }

  public async pull() {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    // on first pull, it might not exist
    if (!this.config.fileid) {
      return {};
    }
    const content = await this.downloadFile(this.config.fileid);
    // TODO update remoteLastModified too
    return { content, lastRemoteChange: this.remoteLastModified };
  }

  private async downloadFile(fileid: string) {
    console.log('[pCloud] fetching file link');
    const res = await this.getFetch<PCloudLinkResponse>('getfilelink', {
      fileid: fileid,
      skipfilename: '1'
    });
    const linkUrl = `https://${res.hosts[0]}${res.path}`;
    const url = this.proxy ? `${this.proxy}/${linkUrl}` : linkUrl;
    // download file content
    console.log('[pCloud] downloading file');
    const data = await fetch(url);
    return await data.json();
  }

  private async uploadFile(content: string, filename: string) {
    const res = await fetch(
      `${this.getUrl('uploadfile')}&folderid=${this.config!.folderid}&filename=${filename}&nopartial=1`,
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

  private async getFetch<T>(
    opName: string,
    params?: {
      path?: string;
      fileid?: string;
      folderid?: string;
      skipfilename?: string;
    }
  ) {
    const path = params?.path ? `&path=${params?.path}` : '';
    const fileid = params?.fileid ? `&fileid=${params?.fileid}` : '';
    const folderid = params?.folderid ? `&folderid=${params?.folderid}` : '';
    const skipfilename = params?.skipfilename
      ? `&skipfilename=${params?.skipfilename}`
      : '';
    const res = await fetch(
      `${this.getUrl(opName)}${fileid}${folderid}${path}${skipfilename}`
    );
    return (await res.json()) as T;
  }

  private getUrl(opName: string) {
    return `${this.serverUrl}/${opName}?username=${this.config!.username}&password=${this.config!.password}`;
  }
}
export const pcloudClient = new KMPCloudClient();
