/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { CollectionItem } from '@/collection/collection';
import {
  FileStorageProvider,
  RemoteStateInfo
} from '@/storage-providers/types';
import { getUniqueId } from 'tinybase/with-schemas';

// for testing
export class InMemProvider extends FileStorageProvider {
  private collection = new Map<string, CollectionItem>();

  public constructor() {
    super('InMem');
  }

  public getConfig() {
    return {};
  }

  public configure(config: any, proxy?: string, useHttp?: boolean) {
    /* nothing to configure */
  }

  public async fetchRemoteStateInfo(state?: string) {
    const remoteStateInfo: RemoteStateInfo = {
      lastRemoteChange: 0,
      state,
      buckets: []
    };
    return { ok: true, remoteStateInfo };
  }

  public async pushFile(filename: string, content: string) {
    const items: CollectionItem[] = JSON.parse(content);
    items.forEach(item => {
      this.collection.set(item.id!, item);
    });
    return `${getUniqueId()}`;
  }

  public async pullFile(providerid: string) {
    const content: CollectionItem[] = [];
    this.collection.forEach(item => {
      content.push(item);
    });
    return { content };
  }
}
