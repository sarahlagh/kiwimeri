import { KMStorageProvider } from '@repo/kiwimeri-sync-core';

type PCloudConf = {
  username: string;
  password: string;
  serverUrl: string;
  folderId?: string;
  path?: string;
};

class KMPCloudClient implements KMStorageProvider {
  private config: PCloudConf | null = null;

  public configure(config: PCloudConf) {
    this.config = config;
    if (!this.config.folderId && !this.config.path) {
      this.config.path = '/';
    }
  }

  public async test() {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    return fetch(this.getUrl('userinfo'))
      .catch(() => false)
      .then(() => true);
  }

  public async push() {
    //
  }
  public async pull() {
    //
  }

  private getUrl(opName: string) {
    return `${this.config!.serverUrl}/${opName}?username=${this.config!.username}&password=${this.config!.password}`;
  }
}
export const pcloudClient = new KMPCloudClient();
