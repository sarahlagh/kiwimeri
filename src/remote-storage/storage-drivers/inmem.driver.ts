/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { CollectionItem } from '@/collection/collection';
import { FileStorageDriver } from '@/remote-storage/sync-types';

// for testing
export class InMemDriver extends FileStorageDriver {
  public static readonly providerfile = 'collection.json';
  private static collection = new Map<
    string,
    Map<string, Map<string, CollectionItem>>
  >();
  private name: string = 'default';
  private static metadata = new Map<
    string,
    Map<string, { lastRemoteChange: number; hash: string }>
  >();

  public constructor() {
    super('inmem');
  }

  public getConfig() {
    return { name: this.name };
  }

  public configure(config: any, proxy?: string, useHttp?: boolean) {
    this.name = config?.name || 'default';
    this.initMap(InMemDriver.providerfile);
  }

  public async fetchFilesInfo(names: string[]) {
    this.initMap(InMemDriver.providerfile);
    const metadata = InMemDriver.metadata
      .get(this.name)!
      .get(InMemDriver.providerfile);
    return {
      filesInfo: names.map(filename => ({
        filename,
        providerid: filename,
        updated: metadata?.lastRemoteChange || 0,
        hash: metadata?.hash
      }))
    };
  }

  public async pushFile(providerid: string, filename: string, content: string) {
    const items: CollectionItem[] = JSON.parse(content);
    this.initMap(providerid, true);
    items.forEach(item => {
      InMemDriver.collection
        .get(this.name)!
        .get(providerid)!
        .set(item.id!, item);
    });
    const str = JSON.stringify(content);
    const hash = `${this.fastHash(str)}`;
    const updated = Date.now();
    InMemDriver.metadata.get(this.name)!.set(providerid, {
      lastRemoteChange: updated,
      hash
    });
    return { providerid, filename, hash, updated };
  }

  public async pullFile(providerid: string, filename: string) {
    this.initMap(providerid);
    const content: CollectionItem[] = [];
    InMemDriver.collection
      .get(this.name)
      ?.get(providerid)
      ?.forEach((item, id) => {
        content.push({ ...item, id });
      });
    return { content };
  }

  private initMap(providerid: string, force = false) {
    if (!InMemDriver.collection.has(this.name)) {
      InMemDriver.collection.set(this.name, new Map());
      InMemDriver.metadata.set(this.name, new Map());
    }
    if (force || !InMemDriver.collection.get(this.name)!.has(providerid)) {
      InMemDriver.collection.get(this.name)!.set(providerid, new Map());
    }
  }

  public reset() {
    InMemDriver.collection.clear();
    InMemDriver.metadata.clear();
  }

  public setContent(items: CollectionItem[]) {
    this.pushFile(InMemDriver.providerfile, 'unused', JSON.stringify(items));
  }

  public getContent() {
    const content: CollectionItem[] = [];
    InMemDriver.collection
      .get(this.name)
      ?.get(InMemDriver.providerfile)
      ?.forEach((item, id) => {
        content.push({ ...item, id });
      });
    return { content };
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
