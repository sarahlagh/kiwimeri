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
import { DriverFileInfo } from '../sync-types';
import { CloudStorageDriver } from './abstract.driver';

type InMemDriverConfig = {
  names?: string[];
  failOnPush?: boolean;
};

// for testing
export class InMemDriver extends CloudStorageDriver {
  private config: Required<InMemDriverConfig>;
  private collection = new Map<string, string>();
  private metadata = new Map<
    string,
    { lastRemoteChange: number; hash: string }
  >();

  public constructor() {
    super('inmem');
    this.config = {
      names: ['collection.json'],
      failOnPush: false
    };
  }

  public getConfig() {
    return this.config;
  }

  public configure(
    config: InMemDriverConfig,
    proxy?: string,
    useHttp?: boolean
  ) {
    this.config = { ...this.config, ...config };
    console.debug('inmem driver config', this.config);
  }

  public async fetchFilesInfo(names: string[]) {
    this.config.names
      .filter(name => this.metadata.has(name))
      .forEach(name => {
        this.clearMap(name);
      });
    return {
      success: true, //names.some(name => this.metadata.has(name)),
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

  public async fileExists(
    filename: string
  ): Promise<{ success: boolean; exists?: boolean }> {
    return { success: true, exists: this.collection.has(filename) };
  }

  public async getFileInfo(
    filename: string
  ): Promise<{ success: boolean; fileInfo?: DriverFileInfo }> {
    const { success, exists } = await this.fileExists(filename);
    if (!success || exists === false) return { success };
    return {
      success,
      fileInfo: {
        filename,
        providerid: filename,
        updated: this.metadata.get(filename)?.lastRemoteChange || 0,
        hash: this.metadata.get(filename)?.hash
      }
    };
  }

  public async pushFile(filename: string, content: string) {
    if (this.config.failOnPush) {
      return { success: false };
    }
    this.clearMap(filename, true);
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
    this.clearMap(filename);
    return { content: this.collection.get(filename), success: true };
  }

  public async deleteFile(providerid: string, filename: string) {
    this.clearMap(filename, true);
    return { success: true };
  }

  public async renameFile(
    providerid: string,
    filename: string,
    newFilename: string
  ): Promise<{ success: boolean }> {
    const colValue = this.collection.get(filename);
    if (colValue) this.collection.set(newFilename, colValue);
    const metaValue = this.metadata.get(filename);
    if (metaValue) this.metadata.set(newFilename, { ...metaValue });
    this.clearMap(filename, true);
    return { success: true };
  }

  public async close() {
    this.collection.clear();
    this.metadata.clear();
  }

  private clearMap(filename: string, force = false) {
    if (force || !this.collection.has(filename)) {
      this.collection.delete(filename);
      this.metadata.delete(filename);
    }
  }

  public setContent(data: AnyData) {
    return this.pushFile(this.config.names[0], JSON.stringify(data));
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
    if (!this.collection.get(this.config.names[0])) return null;
    return JSON.parse(this.collection.get(this.config.names[0])!) as T;
  }

  public getParsedCollectionContent() {
    const obj = JSON.parse(
      this.collection.get(this.config.names[0]) || '{"i":[],"u":0}'
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
