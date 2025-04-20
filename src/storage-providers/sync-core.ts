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
  init: (
    spaceId?: string,
    remoteStateId?: string
  ) => Promise<{
    connected: boolean;
    config: any;
    remoteState: RemoteStateInfo;
  }>;

  getRemoteContent: (
    localContent: Content<SpaceType>,
    localBuckets: Bucket[],
    remoteInfo: RemoteInfo
  ) => Promise<{
    remoteContent: Content<SpaceType>;
    localBuckets: Bucket[];
    remoteInfo: RemoteInfo;
  }>;

  merge: (
    localContent: Content<SpaceType>,
    remoteContent: Content<SpaceType>,
    remoteInfo: RemoteInfo
  ) => Promise<Content<SpaceType>>;

  pull: (
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    localBuckets: Bucket[],
    // remoteContent: Content<SpaceType>,
    remoteInfo: RemoteInfo,
    force?: boolean
  ) => Promise<{
    content?: Content<SpaceType>;
    localBuckets: Bucket[];
    remoteInfo: RemoteInfo;
  }>; // pull space from provider
  push: (
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    localBuckets: Bucket[],
    // remoteContent: Content<SpaceType>,
    remoteInfo: RemoteInfo,
    force?: boolean
  ) => Promise<{ localBuckets: Bucket[]; remoteInfo: RemoteInfo }>; // force push space to provider
}
