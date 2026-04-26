/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { CollectionItem } from '@/collection/collection';
import {
  minimizeItemsForStorage,
  unminimizeItemsFromStorage
} from '@/collection/compress-collection';
import { fastHash } from '@/common/utils';
import { SpaceValues } from '@/db/types/space-types';
import { AnyData } from '@/db/types/store-types';
import { CloudStorageDriver } from './abstract.driver';

// for testing
export class InMemDriver extends CloudStorageDriver {
  private names: string[] = [];
  private collection = new Map<string, string>();
  private metadata = new Map<
    string,
    { lastRemoteChange: number; hash: string }
  >();

  public constructor(names?: string[]) {
    super('inmem');
    this.names = names ? names : ['collection.json'];
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
    const hash = `${fastHash(content)}`;
    const updated = Date.now();
    this.metadata.set(filename, {
      lastRemoteChange: updated,
      hash
    });
    console.debug('[inmem] pushFile', updated, hash);
    return {
      success: true,
      driverInfo: { providerid: filename, filename, hash, updated }
    };
  }

  public async pullFile(providerid: string, filename: string) {
    this.initMap(filename);
    return { content: this.collection.get(filename), success: true };
  }

  public async deleteFile(providerid: string, filename: string) {
    this.initMap(filename, true);
    return { success: true };
  }

  public async close() {
    this.collection.clear();
    this.metadata.clear();
  }

  private initMap(filename: string, force = false) {
    if (force || !this.collection.has(filename)) {
      this.collection.delete(filename);
      this.metadata.delete(filename);
    }
  }

  public setContent(data: AnyData) {
    return this.pushFile(this.names[0], JSON.stringify(data));
  }

  public setCollectionContent(
    items: CollectionItem[],
    values: SpaceValues,
    updated: number
  ) {
    return this.setContent({
      i: minimizeItemsForStorage(items),
      o: values,
      u: updated
    });
  }

  public getParsedContent<T>() {
    if (!this.collection.get(this.names[0])) return null;
    return JSON.parse(this.collection.get(this.names[0])!) as T;
  }

  public getParsedCollectionContent() {
    const obj = JSON.parse(
      this.collection.get(this.names[0]) || '{"i":[],"u":0}'
    ) as {
      i: CollectionItem[];
      o: SpaceValues;
    };
    const unminimizedObj = { ...obj, i: unminimizeItemsFromStorage(obj.i) };
    return {
      content: unminimizedObj.i,
      values: unminimizedObj.o
    };
  }
}
