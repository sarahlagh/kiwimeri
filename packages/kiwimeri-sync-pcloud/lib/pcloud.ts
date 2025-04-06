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
  private fileLinkUrl?: string;

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
  }

  public async test() {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    const ok = await fetch(this.getUrl('userinfo'))
      .catch(() => false)
      .then(() => true);

    if (ok && this.config.path !== '/') {
      const res = await this.getFetch<PCloudListResponse>('listfolder', {
        path: this.config.path
      });
      if (res.result !== PCloudResult.ok) {
        console.log('pcloud error:', res);
        return false;
      }
    }
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

    return this.config;
  }

  public async push(content: string) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    const file = new File(
      [new Blob([content], { type: 'application/json' })],
      this.filename
    );
    const form = new FormData();
    form.append(
      'file', // the name is ignored
      file
    );

    const res = await fetch(
      `${this.getUrl('uploadfile')}&folderid=${this.config.folderid}&nopartial=1`,
      {
        method: 'POST',
        body: form
      }
    );
    const json = (await res.json()) as PCloudUploadResponse;
    if (!this.config.fileid) {
      this.config.fileid = `${json.fileids[0]}`;
    }
    this.fileLinkUrl = undefined;
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
    if (!this.fileLinkUrl) {
      const fileLink = await this.getFetch<PCloudLinkResponse>('getfilelink', {
        fileid: this.config.fileid,
        skipfilename: '1'
      });
      const url = `https://${fileLink.hosts[0]}${fileLink.path}`;
      this.fileLinkUrl = this.config.proxy
        ? `${this.config.proxy}/${url}`
        : url;
      // TODO check link expiration
    }
    // download file content
    const data = await fetch(this.fileLinkUrl);
    return await data.json();
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
