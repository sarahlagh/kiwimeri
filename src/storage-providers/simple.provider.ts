import { CollectionItem } from '@/collection/collection';
import { SpaceType } from '@/db/types/db-types';
import { AnyData, LocalChange } from '@/db/types/store-types';
import {
  Bucket,
  RemoteInfo,
  StorageProvider
} from '@/storage-providers/sync-core';
import { Table as UntypedTable } from 'tinybase';
import { Content } from 'tinybase/with-schemas';

export abstract class SimpleStorageProvider implements StorageProvider {
  private providerName: string;
  protected readonly filename = 'collection.json';

  public constructor(providerName: string) {
    this.providerName = providerName;
  }

  public abstract configure(
    config: AnyData,
    proxy?: string,
    useHttp?: boolean
  ): void;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public abstract getConfig(): any | null;

  protected abstract testConnection(
    state?: string
  ): Promise<{ ok: boolean; lastRemoteChange: number }>;

  protected abstract pushItem(filename: string, content: string): Promise<void>;

  protected abstract pullItem(
    providerid: string
  ): Promise<{ content: CollectionItem[] }>;

  public async init(remoteStateId?: string) {
    const { ok, lastRemoteChange } = await this.testConnection(remoteStateId);

    console.log(`${this.providerName} client initialized`, {
      ...this.getConfig(),
      password: '*******'
    });

    return {
      config: this.getConfig(),
      connected: ok,
      remoteState: {
        state: remoteStateId,
        lastRemoteChange,
        buckets: []
      }
    };
  }

  public async push(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    localBuckets: Bucket[],
    remoteInfo: RemoteInfo
  ) {
    if (!this.getConfig()) {
      throw new Error(`uninitialized ${this.providerName} config`);
    }

    const collection = this.toMap<CollectionItem>(localContent[0].collection!);
    const content = JSON.stringify(
      collection
        .keys()
        .map(id => collection.get(id))
        .toArray()
    );
    await this.pushItem(this.filename, content);

    console.debug('new remoteInfo in mem', content);
    return {
      localBuckets,
      remoteInfo
    };
  }

  public async pull(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    localBuckets: Bucket[],
    remoteInfo: RemoteInfo
  ) {
    if (!this.getConfig()) {
      throw new Error(`uninitialized ${this.providerName} config`);
    }
    const { content } = await this.pullItem(this.filename);
    localContent[0].collection = {};
    content.forEach(item => {
      localContent[0].collection![item.id!] = item;
    });
    return {
      content: localContent,
      localBuckets,
      remoteInfo
    };
  }

  private toMap<T>(obj: UntypedTable) {
    const map: Map<string, T> = new Map();
    Object.keys(obj).forEach(id => {
      map.set(id, { ...(obj[id] as unknown as T), id });
    });
    return map;
  }
}
