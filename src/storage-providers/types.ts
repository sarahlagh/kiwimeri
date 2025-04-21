import { CollectionItem } from '@/collection/collection';
import { SpaceType } from '@/db/types/db-types';
import { LocalChange, RemoteItemInfo } from '@/db/types/store-types';
import { Table as UntypedTable } from 'tinybase';
import { Content } from 'tinybase/with-schemas';

export type Bucket = {
  rank: number;
  providerid: string;
  lastRemoteChange: number;
  size: number;
  hash?: number;
};

export type RemoteStateInfo = {
  state?: string;
  lastRemoteChange: number;
  buckets: Bucket[];
};

export type RemoteInfo = {
  remoteItems: RemoteItemInfo[];
} & RemoteStateInfo;

/* eslint-disable @typescript-eslint/no-explicit-any */
export abstract class StorageLayer {
  abstract configure(conf: any, proxy?: string, useHttp?: boolean): void; // accept user input and save in local store

  abstract init(remoteStateId?: string): Promise<{
    connected: boolean;
    config: any;
    remoteState: RemoteStateInfo;
  }>;

  abstract pull(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    localBuckets: Bucket[],
    remoteInfo: RemoteInfo,
    force?: boolean
  ): Promise<{
    content?: Content<SpaceType>;
    localBuckets: Bucket[];
    remoteInfo: RemoteInfo;
  }>;

  abstract push(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    localBuckets: Bucket[],
    remoteInfo: RemoteInfo,
    force?: boolean
  ): Promise<{ localBuckets: Bucket[]; remoteInfo: RemoteInfo }>;

  protected toMap<T>(obj: UntypedTable) {
    const map: Map<string, T> = new Map();
    Object.keys(obj).forEach(id => {
      map.set(id, { ...(obj[id] as unknown as T), id });
    });
    return map;
  }
}

export abstract class FileStorageProvider {
  public constructor(public providerName: string) {}

  public async init(remoteStateId?: string) {
    const { ok, remoteStateInfo: remoteState } =
      await this.fetchRemoteStateInfo(remoteStateId);

    console.log(`${this.providerName} client initialized`, {
      ...this.getConfig(),
      password: '*******'
    });

    return {
      config: this.getConfig(),
      connected: ok,
      remoteState
    };
  }

  public abstract configure(conf: any, proxy?: string, useHttp?: boolean): void; // accept user input and save in local store

  public abstract getConfig(): any | null;

  public abstract fetchRemoteStateInfo(
    state?: string
  ): Promise<{ ok: boolean; remoteStateInfo: RemoteStateInfo }>;

  public abstract pushFile(filename: string, content: string): Promise<string>;

  public abstract pullFile(
    providerid: string
  ): Promise<{ content: CollectionItem[] }>;
}
