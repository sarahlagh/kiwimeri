/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { AnyData } from '@/core/db/types';
import {
  BaseCollectionItem,
  CollectionItem
} from '@/domain/collection/collection';
import {
  minimizeAnnotForStorage,
  unminimizeAnnotFromStorage
} from '@/domain/collection/compress-annotations';
import {
  minimizeItemsForStorage,
  unminimizeItemsFromStorage
} from '@/domain/collection/compress-collection';
import {
  BaseDocAnnotation,
  DocAnnotation
} from '@/domain/collection/document-annotations';
import { toArray, toTable } from '@/domain/space-merging/merge-utils';
import { SpacePortableData, TableOf } from '@/domain/space-merging/types';
import { CloudStorageDriver } from '@/domain/synchronization/drivers/abstract.driver';
import {
  DriverFileInfo,
  FileReference
} from '@/domain/synchronization/drivers/types';
import {
  REMOTE_COLLECTION_SCHEMA_VERSION,
  RemoteCollectionFileContent
} from '@/domain/synchronization/synchronizers/collection-synchronizer';
import {
  minimizePrefsForStorage,
  unminimizePrefsFromStorage
} from '@/domain/user-preferences/compress-user-prefs';
import {
  BaseUserPreference,
  UserPreference
} from '@/domain/user-preferences/user-preferences';
import { fastHash } from '@/shared/utils';

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

  public async fetchFilesInfo(fileRefs: FileReference[]) {
    this.config.names
      .filter(name => this.metadata.has(name))
      .forEach(name => {
        this.clearMap(name);
      });
    return {
      success: true, //names.some(name => this.metadata.has(name)),
      filesInfo: fileRefs
        .filter(ref => this.metadata.has(ref.filename))
        .map(ref => ({
          filename: ref.filename,
          providerid: ref.providerid || ref.filename,
          updated: this.metadata.get(ref.filename)?.lastRemoteChange || 0,
          hash: this.metadata.get(ref.filename)?.hash
        }))
    };
  }

  public async fileExists(
    fileRef: FileReference
  ): Promise<{ success: boolean; exists?: boolean }> {
    return { success: true, exists: this.collection.has(fileRef.filename) };
  }

  public async getFileInfo(
    fileRef: FileReference
  ): Promise<{ success: boolean; fileInfo?: DriverFileInfo }> {
    const { success, exists } = await this.fileExists(fileRef);
    if (!success || exists === false) return { success };
    return {
      success,
      fileInfo: {
        filename: fileRef.filename,
        providerid: fileRef.providerid || fileRef.filename,
        updated: this.metadata.get(fileRef.filename)?.lastRemoteChange || 0,
        hash: this.metadata.get(fileRef.filename)?.hash
      }
    };
  }

  public async pushFile(fileRef: FileReference, content: string) {
    if (this.config.failOnPush) {
      return { success: false };
    }
    this.clearMap(fileRef.filename, true);
    this.collection.set(fileRef.filename, content);
    const hash = `${fastHash(content)}`;
    const updated = Date.now();
    this.metadata.set(fileRef.filename, {
      lastRemoteChange: updated,
      hash
    });
    console.debug('[inmem] pushFile', updated, hash);
    return {
      success: true,
      driverInfo: {
        filename: fileRef.filename,
        providerid: fileRef.providerid || fileRef.filename,
        hash,
        updated
      }
    };
  }

  public async pullFile(fileRef: FileReference) {
    this.clearMap(fileRef.filename);
    return { content: this.collection.get(fileRef.filename), success: true };
  }

  public async deleteFile(fileRef: FileReference) {
    this.clearMap(fileRef.filename, true);
    return { success: true };
  }

  public async renameFile(fileRef: FileReference, newFilename: string) {
    const colValue = this.collection.get(fileRef.filename);
    if (colValue) this.collection.set(newFilename, colValue);
    const metaValue = this.metadata.get(fileRef.filename);
    if (metaValue) this.metadata.set(newFilename, { ...metaValue });
    this.clearMap(fileRef.filename, true);
    return {
      success: true,
      driverInfo: {
        filename: newFilename,
        providerid: fileRef.providerid || newFilename,
        hash: this.metadata.get(newFilename)!.hash,
        updated: this.metadata.get(newFilename)!.lastRemoteChange
      }
    };
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
    return this.pushFile(
      { filename: this.config.names[0] },
      JSON.stringify(data)
    );
  }

  public setCollectionContentWithAnnots(
    items: TableOf<BaseCollectionItem> | CollectionItem[],
    annots: TableOf<BaseDocAnnotation> | DocAnnotation[],
    updated: number
  ) {
    const _itemsArr = Array.isArray(items) ? items : toArray(items);
    const _annotsArr = Array.isArray(annots) ? annots : toArray(annots);
    return this.setContent({
      i: minimizeItemsForStorage(_itemsArr),
      a: minimizeAnnotForStorage(_annotsArr),
      u: updated,
      _v: REMOTE_COLLECTION_SCHEMA_VERSION
    } as RemoteCollectionFileContent);
  }

  public setCollectionContentWithPrefs(
    items: TableOf<BaseCollectionItem> | CollectionItem[],
    prefs: TableOf<BaseUserPreference> | UserPreference[],
    updated: number
  ) {
    const _itemsArr = Array.isArray(items) ? items : toArray(items);
    const _prefsArr = Array.isArray(prefs) ? prefs : toArray(prefs);
    return this.setContent({
      i: minimizeItemsForStorage(_itemsArr),
      o: minimizePrefsForStorage(_prefsArr),
      u: updated,
      _v: REMOTE_COLLECTION_SCHEMA_VERSION
    } as RemoteCollectionFileContent);
  }

  public setCollectionContent(
    items: TableOf<BaseCollectionItem> | CollectionItem[],
    updated: number
  ) {
    const _itemsArr = Array.isArray(items) ? items : toArray(items);
    return this.setContent({
      i: minimizeItemsForStorage(_itemsArr),
      u: updated,
      _v: REMOTE_COLLECTION_SCHEMA_VERSION
    } as RemoteCollectionFileContent);
  }

  public getParsedContent<T>() {
    if (!this.collection.get(this.config.names[0])) return null;
    return JSON.parse(this.collection.get(this.config.names[0])!) as T;
  }

  public getParsedCollectionContent(): SpacePortableData {
    const obj = JSON.parse(
      this.collection.get(this.config.names[0]) || '{"i":[],"u":0}'
    ) as RemoteCollectionFileContent;
    return {
      items: toTable(unminimizeItemsFromStorage(obj.i)),
      annots: toTable(unminimizeAnnotFromStorage(obj.a || [])),
      userPrefs: toTable(unminimizePrefsFromStorage(obj.o || [])),
      lastChange: obj.u,
      schemaVersion: obj._v || REMOTE_COLLECTION_SCHEMA_VERSION
    };
  }
}
