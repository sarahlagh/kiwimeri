import {
  FileStorageProvider,
  RemoteStateInfo
} from '@/storage-providers/types';
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
};

export class PCloudProvider extends FileStorageProvider {
  private proxy?: string;
  private config: PCloudConf | null = null;
  private serverUrl!: string;

  private api = {
    us: 'api.pcloud.com',
    eu: 'eapi.pcloud.com'
  };

  public constructor() {
    super('PCloud');
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

  public async fetchRemoteStateInfo(state?: string) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    const remoteStateInfo: RemoteStateInfo = {
      lastRemoteChange: 0,
      state,
      buckets: []
    };
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
      return { ok: false, remoteStateInfo };
    }
    this.config.folderid = `${res.metadata!.folderid!}`;
    let lastRemoteChange = 0;
    if (res.metadata?.contents) {
      remoteStateInfo.buckets = res.metadata.contents
        .filter(f => !f.isfolder && f.name.match(/bucket(\d*).json/))
        .map(f => ({
          rank: this.parseRank(f.name),
          providerid: `${f.fileid}`,
          size: f.size,
          hash: f.hash,
          lastRemoteChange: new Date(f.modified).getTime()
        }));
      lastRemoteChange = Math.max(
        ...remoteStateInfo.buckets.map(b => b.lastRemoteChange)
      );
    }
    remoteStateInfo.lastRemoteChange = lastRemoteChange;
    console.log('[pCloud] connection tested OK');
    return { ok: true, remoteStateInfo };
  }

  // protected async testConnection(state?: string) {
  //   if (!this.config) {
  //     throw new Error('uninitialized pcloud config');
  //   }
  //   const remoteStateInfo: RemoteStateInfo = {
  //     lastRemoteChange: 0,
  //     state,
  //     buckets: []
  //   };
  //   let res: PCloudListResponse;
  //   if (!this.config.folderid) {
  //     res = await this.getFetch<PCloudListResponse>('listfolder', {
  //       path: this.config.path
  //     });
  //   } else {
  //     res = await this.getFetch<PCloudListResponse>('listfolder', {
  //       folderid: this.config.folderid
  //     });
  //   }
  //   if (res.result !== PCloudResult.ok) {
  //     console.error('[pCloud] error:', res);
  //     return { ok: false, lastRemoteChange: 0 };
  //   }
  //   this.config.folderid = `${res.metadata!.folderid!}`;
  //   if (res.metadata?.contents) {
  //     const f = res.metadata.contents.find(f => f.name === this.filename);
  //     if (f) {
  //       this.fileid = f.fileid;
  //       remoteStateInfo.lastRemoteChange = new Date(f.modified).getTime();
  //     }
  //   }
  //   console.log('[pCloud] connection tested OK');
  //   return { ok: true, lastRemoteChange: remoteStateInfo.lastRemoteChange };
  // }

  public async pushFile(filename: string, content: string) {
    if (!this.config || !this.config.folderid) {
      throw new Error('uninitialized pcloud config');
    }
    const resp = await this.uploadFile(content, filename, this.config.folderid);
    if (resp.result !== PCloudResult.ok || resp.metadata.length === 0) {
      console.log('[pCloud] error uploading changes');
      // TODO handle error
    }
    return `${resp.fileids[0]}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async pullFile(providerid: string) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    const content = await this.downloadFile(providerid);
    return { content };
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

  protected parseRank(fname: string) {
    const match = fname.match(/bucket(\d*).json/);
    try {
      if (match && match.length > 1) {
        return parseInt(match[1]);
      }
    } catch (e) {
      console.debug('error parsing file name', e);
    }
    return 0;
  }
}
