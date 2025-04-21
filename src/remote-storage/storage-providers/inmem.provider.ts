/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { CollectionItem } from '@/collection/collection';
import { FileStorageProvider, RemoteStateInfo } from '@/remote-storage/types';

// for testing
export class InMemProvider extends FileStorageProvider {
  public static readonly providerfile = 'bucket1.json';
  private static collection = new Map<
    string,
    Map<string, Map<string, CollectionItem>>
  >();
  private name: string = 'default';

  public constructor() {
    super('InMem');
  }

  public getConfig() {
    return { name: this.name };
  }

  public configure(config: any, proxy?: string, useHttp?: boolean) {
    this.name = config?.name || 'default';
    this.initMap();
  }

  public async fetchRemoteStateInfo(state?: string) {
    const remoteStateInfo: RemoteStateInfo = {
      lastRemoteChange: 0,
      state,
      buckets: [
        {
          lastRemoteChange: 0,
          providerid: InMemProvider.providerfile,
          rank: 1,
          size: 20
        }
      ]
    };
    return { ok: true, remoteStateInfo };
  }

  public async pushFile(filename: string, content: string) {
    const items: CollectionItem[] = JSON.parse(content);
    this.initMap(filename);
    items.forEach(item => {
      InMemProvider.collection
        .get(this.name)!
        .get(filename)!
        .set(item.id!, item);
    });
    return filename;
  }

  public async pullFile(providerid: string) {
    this.initMap(providerid);
    const content: CollectionItem[] = [];
    InMemProvider.collection
      .get(this.name)
      ?.get(providerid)
      ?.forEach(item => {
        content.push(item);
      });
    return { content };
  }

  private initMap(filename?: string) {
    if (!InMemProvider.collection.has(this.name)) {
      InMemProvider.collection.set(this.name, new Map());
    }
    if (filename) {
      if (!InMemProvider.collection.get(this.name)!.has(filename)) {
        InMemProvider.collection.get(this.name)!.set(filename, new Map());
      }
    }
  }

  public reset() {
    InMemProvider.collection.clear();
  }
}
