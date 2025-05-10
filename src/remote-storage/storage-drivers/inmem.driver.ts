/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { CollectionItem } from '@/collection/collection';
import { FileStorageDriver } from '@/remote-storage/sync-types';

// for testing
export class InMemDriver extends FileStorageDriver {
  private names: string[] = [];
  private collection = new Map<string, string>();
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
    names
      .filter(name => this.metadata.has(name))
      .forEach(name => {
        this.initMap(name);
      });
    return {
      connected: true,
      filesInfo: names
        .filter(name => this.metadata.has(name))
        .map(filename => ({
          filename,
          providerid: filename,
          updated: this.metadata.get(filename)?.lastRemoteChange || 0,
          hash: this.metadata.get(filename)?.hash
        }))
    };
  }

  public async pushFile(filename: string, content: string) {
    this.initMap(filename, true);
    this.collection.set(filename, content);
    const hash = `${this.fastHash(content)}`;
    const updated = Date.now();
    this.metadata.set(filename, {
      lastRemoteChange: updated,
      hash
    });
    console.debug('[inmem] pushFile', updated, hash);
    return { providerid: filename, filename, hash, updated };
  }

  public async pullFile(providerid: string, filename: string) {
    this.initMap(filename);
    return { content: this.collection.get(filename) };
  }

  public async deleteFile(providerid: string, filename: string) {
    this.initMap(filename, true);
  }

  private initMap(filename: string, force = false) {
    if (force || !this.collection.has(filename)) {
      this.collection.delete(filename);
      this.metadata.delete(filename);
    }
  }

  public setContent(items: CollectionItem[], updated: number) {
    return this.pushFile(
      this.names[0],
      JSON.stringify({ i: items, u: updated })
    );
  }

  public getContent() {
    console.debug('[getRemoteContent]', this.collection.get(this.names[0]));
    return {
      content: (
        JSON.parse(this.collection.get(this.names[0]) || '{}') as {
          i: CollectionItem[];
          u: number;
        }
      ).i
    };
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
