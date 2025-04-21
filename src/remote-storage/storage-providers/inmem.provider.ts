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
  private static timestamps = new Map<string, Map<string, number>>();

  public constructor() {
    super('InMem');
  }

  public getConfig() {
    return { name: this.name };
  }

  public configure(config: any, proxy?: string, useHttp?: boolean) {
    this.name = config?.name || 'default';
    this.initMap(InMemProvider.providerfile);
  }

  public async fetchRemoteStateInfo(state?: string) {
    const { content } = await this.pullFile(InMemProvider.providerfile);
    const str = JSON.stringify(content);
    const lastRemoteChange =
      InMemProvider.timestamps
        .get(this.name)!
        .get(InMemProvider.providerfile) || 0;
    const remoteStateInfo: RemoteStateInfo = {
      lastRemoteChange,
      state,
      buckets: [
        {
          lastRemoteChange,
          providerid: InMemProvider.providerfile,
          rank: 1,
          size: str.length,
          hash: this.fastHash(str)
        }
      ]
    };
    return { ok: true, remoteStateInfo };
  }

  public async pushFile(filename: string, content: string) {
    const items: CollectionItem[] = JSON.parse(content);
    this.initMap(filename, true);
    items.forEach(item => {
      InMemProvider.collection
        .get(this.name)!
        .get(filename)!
        .set(item.id!, item);
    });
    InMemProvider.timestamps.get(this.name)!.set(filename, Date.now());
    return filename;
  }

  public async pullFile(providerid: string) {
    this.initMap(providerid);
    const content: CollectionItem[] = [];
    InMemProvider.collection
      .get(this.name)
      ?.get(providerid)
      ?.forEach((item, id) => {
        content.push({ ...item, id });
      });
    return { content };
  }

  private initMap(filename: string, force = false) {
    if (!InMemProvider.collection.has(this.name)) {
      InMemProvider.collection.set(this.name, new Map());
      InMemProvider.timestamps.set(this.name, new Map());
    }
    if (force || !InMemProvider.collection.get(this.name)!.has(filename)) {
      InMemProvider.collection.get(this.name)!.set(filename, new Map());
      InMemProvider.timestamps.get(this.name)!.set(filename, Date.now());
    }
  }

  public reset() {
    InMemProvider.collection.clear();
  }

  private fastHash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i); // Hashing algorithm
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
}
