/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { CollectionItem } from '@/collection/collection';
import { FileStorageDriver } from '@/remote-storage/sync-types';

// for testing
export class InMemDriver extends FileStorageDriver {
  private names: string[] = [];
  private collection = new Map<string, Map<string, CollectionItem>>();
  private metadata = new Map<
    string,
    { lastRemoteChange: number; hash: string }
  >();

  public constructor() {
    super('inmem');
    this.names = ['collection.json'];
  }

  public getConfig() {
    return {};
  }

  public configure(config: any, proxy?: string, useHttp?: boolean) {
    /* */
  }

  public async fetchFilesInfo(names: string[]) {
    this.names = names;
    names.forEach(name => {
      this.initMap(name);
    });
    return {
      filesInfo: names.map(filename => ({
        filename,
        providerid: filename,
        updated: this.metadata.get(filename)?.lastRemoteChange || 0,
        hash: this.metadata.get(filename)?.hash
      }))
    };
  }

  public async pushFile(providerid: string, filename: string, content: string) {
    const items: CollectionItem[] = JSON.parse(content);
    this.initMap(filename, true);
    items.forEach(item => {
      this.collection.get(filename)!.set(item.id!, item);
    });
    const str = JSON.stringify(content);
    const hash = `${this.fastHash(str)}`;
    const updated = Date.now();
    this.metadata.set(filename, {
      lastRemoteChange: updated,
      hash
    });
    return { providerid: filename, filename, hash, updated };
  }

  public async pullFile(providerid: string, filename: string) {
    this.initMap(filename);
    const content: CollectionItem[] = [];
    this.collection.get(filename)?.forEach((item, id) => {
      content.push({ ...item, id });
    });
    return { content };
  }

  private initMap(filename: string, force = false) {
    if (force || !this.collection.has(filename)) {
      this.collection.set(filename, new Map());
      this.metadata.delete(filename);
    }
  }

  public setContent(items: CollectionItem[]) {
    return this.pushFile(this.names[0], this.names[0], JSON.stringify(items));
  }

  public getContent() {
    const content: CollectionItem[] = [];
    this.collection.get(this.names[0])?.forEach((item, id) => {
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
