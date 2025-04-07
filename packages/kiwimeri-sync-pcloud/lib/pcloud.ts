// import { KMStorageProvider } from '@repo/kiwimeri-sync-core';
import {
  PCloudLinkResponse,
  PCloudListResponse,
  PCloudResult,
  PCloudUploadResponse
} from './types';

type PCloudConf = {
  proxy?: string;
  username: string;
  password: string;
  serverUrl: string;
  path?: string;
  folderid?: string;
  fileid?: string;
};

class KMPCloudClient /*implements KMStorageProvider*/ {
  private config: PCloudConf | null = null;

  private filename!: string;

  public configure(config: PCloudConf) {
    this.config = config;
    if (!this.config.folderid && !this.config.path) {
      this.config.path = '/';
    }
    if (this.config.proxy) {
      if (this.config.proxy.endsWith('/')) {
        this.config.proxy = this.config.proxy.substring(
          0,
          this.config.proxy.length - 1
        );
      }
      this.config.serverUrl = `${this.config.proxy}/${this.config.serverUrl}`;
    }
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
      .catch(() => false)
      .then(() => true);

    if (ok) {
      let res;
      if (this.config.path !== '/' && !this.config.folderid) {
        res = await this.getFetch<PCloudListResponse>('listfolder', {
          path: this.config.path
        });
      } else if (this.config.folderid) {
        res = await this.getFetch<PCloudListResponse>('listfolder', {
          folderid: this.config.folderid
        });
      }
      if (res && res.result !== PCloudResult.ok) {
        console.error('[pCloud] error:', res);
        return false;
      }
    }
    console.log('[pCloud] connection tested OK');
    return ok;
  }

  // after all, move to core
  public async init(spaceId: string) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    this.filename = `kiwimeri-${spaceId}.json`;

    if (!this.config.folderid || !this.config.fileid) {
      const res = await this.getFetch<PCloudListResponse>('listfolder', {
        path: this.config.path
      });
      if (!this.config.folderid) {
        this.config.folderid = `${res.metadata!.folderid!}`;
      }
      if (!this.config.fileid && res.metadata?.contents) {
        const file = res.metadata.contents.find(
          content => content.name === this.filename
        );
        if (file) {
          this.config.fileid = `${file.fileid}`;
        }
      }
    }

    console.log('[pCloud] client initialized', {
      ...this.config,
      password: '*******'
    });
    return this.config;
  }

  public async push(content: string) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    const resp = await this.uploadFile(content, this.filename);
    console.log('[pCloud] uploaded changes', resp);
    if (resp.result !== PCloudResult.ok || resp.checksums.length === 0) {
      console.log('[pCloud] error uploading changes');
      // TODO handle error
      return;
    }
    if (!this.config.fileid) {
      this.config.fileid = `${resp.fileids[0]}`;
    }
  }

  public async pull() {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    // on first pull, it might not exist
    if (!this.config.fileid) {
      return;
    }
    // get file download link
    console.log('[pCloud] fetching file link');
    const res = await this.getFetch<PCloudLinkResponse>('getfilelink', {
      fileid: this.config.fileid,
      skipfilename: '1'
    });
    const linkUrl = `https://${res.hosts[0]}${res.path}`;
    const url = this.config.proxy ? `${this.config.proxy}/${linkUrl}` : linkUrl;
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
    return `${this.config!.serverUrl}/${opName}?username=${this.config!.username}&password=${this.config!.password}`;
  }
}
export const pcloudClient = new KMPCloudClient();
