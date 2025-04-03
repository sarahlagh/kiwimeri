import { KMCloudClient } from '@repo/kiwimeri-sync-core';
import base64 from 'base-64';
// import { createClient, WebDAVClient } from 'webdav';
import { CapacitorHttp, HttpOptions, HttpResponse } from '@capacitor/core';

type WebdavConf = {
  username: string;
  password: string;
  serverUrl: string;
  path?: string;
};

function generateBasicAuthHeader(username: string, password: string) {
  const encoded = base64.encode(`${username}:${password}`);
  return `Basic ${encoded}`;
}

class KMWebdavClient implements KMCloudClient {
  private config: WebdavConf | null = null;
  private auth: string;
  // private client: WebDAVClient | null = null;

  public configure(config: WebdavConf) {
    this.config = config;
    if (this.config.path) {
      this.config.serverUrl += '/' + this.config.path;
    }
  }
  public init() {
    if (!this.config) {
      throw new Error('uninitialized webdav client');
    }
    console.debug('init webdav', { ...this.config, password: '********' });

    this.auth = generateBasicAuthHeader(
      this.config.username,
      this.config.password
    );
    // this.client = createClient(this.config.serverUrl, {
    //   username: this.config.username,
    //   password: this.config.password
    // });
  }
  public async push() {
    // if (!this.client) {
    //   throw new Error('uninitialized webdav client');
    // }
  }
  public async pull() {
    if (!this.config) {
      throw new Error('uninitialized webdav client');
    }
    // const directoryItems = await this.client.getDirectoryContents('/');
    // console.log(directoryItems, directoryItems);

    const options: HttpOptions = {
      url: this.config.serverUrl,
      method: 'OPTIONS',
      headers: {
        Authorization: this.auth,
        Accept: 'text/plain,application/xml',
        Depth: '1'
      }
    };
    const response: HttpResponse = await CapacitorHttp.request(options);
    console.log('response', response);
    if (response.status !== 200) {
      throw new Error(`${response.status}`);
    }
  }
}

export const webdavClient = new KMWebdavClient();
