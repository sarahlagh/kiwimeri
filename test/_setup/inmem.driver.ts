/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  minimizeItemsForStorage,
  unminimizeItemsFromStorage
} from '@/collection/compress-collection';
import { fastHash } from '@/common/utils';
import { AnyData } from '@/db/types/store-types';
import { CollectionItem } from '@/domain/collection/model';
import {
  minimizeAnnotForStorage,
  unminimizeAnnotFromStorage
} from '@/domain/document-annotations/compress-annotations';
import { SyncableAnnotation } from '@/domain/document-annotations/model';
import { CloudStorageDriver } from '@/domain/remotes/drivers/abstract.driver';
import { DriverFileInfo, FileReference } from '@/domain/remotes/drivers/model';
import {
  REMOTE_COLLECTION_SCHEMA_VERSION,
  RemoteCollectionFileContent
} from '@/domain/replication/merging/synchronizers/collection-synchronizer';
import {
  minimizePrefsForStorage,
  unminimizePrefsFromStorage
} from '@/domain/user-preferences/compress-user-prefs';
import { SyncableUserPref } from '@/domain/user-preferences/model';

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
    items: CollectionItem[],
    annots: SyncableAnnotation[],
    updated: number
  ) {
    return this.setContent({
      i: minimizeItemsForStorage(items),
      a: minimizeAnnotForStorage(annots),
      u: updated,
      _v: REMOTE_COLLECTION_SCHEMA_VERSION
    } as RemoteCollectionFileContent);
  }

  public setCollectionContentWithPrefs(
    items: CollectionItem[],
    prefs: SyncableUserPref[],
    updated: number
  ) {
    return this.setContent({
      i: minimizeItemsForStorage(items),
      o: minimizePrefsForStorage(prefs),
      u: updated,
      _v: REMOTE_COLLECTION_SCHEMA_VERSION
    } as RemoteCollectionFileContent);
  }

  public setCollectionContent(items: CollectionItem[], updated: number) {
    return this.setContent({
      i: minimizeItemsForStorage(items),
      u: updated,
      _v: REMOTE_COLLECTION_SCHEMA_VERSION
    } as RemoteCollectionFileContent);
  }

  public getParsedContent<T>() {
    if (!this.collection.get(this.config.names[0])) return null;
    return JSON.parse(this.collection.get(this.config.names[0])!) as T;
  }

  public getParsedCollectionContent() {
    const obj = JSON.parse(
      this.collection.get(this.config.names[0]) || '{"i":[],"u":0}'
    ) as RemoteCollectionFileContent;
    const unminimizedObj = {
      ...obj,
      i: unminimizeItemsFromStorage(obj.i),
      a: unminimizeAnnotFromStorage(obj.a || []),
      o: unminimizePrefsFromStorage(obj.o || [])
    };
    return {
      content: unminimizedObj.i,
      annots: unminimizedObj.a,
      prefs: unminimizedObj.o,
      _schemaVersion: obj._v
    };
  }
}
