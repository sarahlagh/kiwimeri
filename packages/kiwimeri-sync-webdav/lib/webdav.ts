import { createClient, WebDAVClient } from 'webdav';

type WebdavConf = {
  username: string;
  password: string;
  serverUrl: string;
  path?: string;
};

class KMWebdavClient /*implements KMStorageProvider*/ {
  private config: WebdavConf | null = null;
  private client: WebDAVClient | null = null;

  public configure(config: WebdavConf) {
    this.config = config;
    if (this.config.path) {
      this.config.serverUrl += '/' + this.config.path;
    }
  }
  public async test() {
    return true;
  }
  public init() {
    if (!this.config) {
      throw new Error('uninitialized webdav client');
    }
    console.debug('init webdav', { ...this.config, password: '********' });

    this.client = createClient(this.config.serverUrl, {
      username: this.config.username,
      password: this.config.password
    });
  }
  public async push() {
    // }
  }
  public async pull() {
    if (!this.client) {
      throw new Error('uninitialized webdav client');
    }
    const directoryItems = await this.client.getDirectoryContents('/');
    console.log('directory items', directoryItems);
    return directoryItems;
  }
}

export const webdavClient = new KMWebdavClient();
