import { SpaceType } from '@/db/types/db-types';
import { LocalChange, RemoteItemInfo } from '@/db/types/store-types';
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
export interface StorageProvider {
  configure: (conf: any, proxy?: string, useHttp?: boolean) => void; // accept user input and save in local store

  init: (remoteStateId?: string) => Promise<{
    connected: boolean;
    config: any;
    remoteState: RemoteStateInfo;
  }>;

  pull: (
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    localBuckets: Bucket[],
    remoteInfo: RemoteInfo,
    force?: boolean
  ) => Promise<{
    content?: Content<SpaceType>;
    localBuckets: Bucket[];
    remoteInfo: RemoteInfo;
  }>;

  push: (
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    localBuckets: Bucket[],
    remoteInfo: RemoteInfo,
    force?: boolean
  ) => Promise<{ localBuckets: Bucket[]; remoteInfo: RemoteInfo }>;
}
