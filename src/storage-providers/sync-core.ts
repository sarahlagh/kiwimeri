import { SpaceType } from '@/db/types/db-types';
import { LocalChange, RemoteItemInfo } from '@/db/types/store-types';
import { Content } from 'tinybase/with-schemas';

export type RemoteBucket = {
  rank: number;
  providerid: string;
  lastRemoteChange: number;
  size: number;
  hash?: number;
};

export type RemoteStateInfo = {
  state?: string;
  lastRemoteChange: number;
  buckets: RemoteBucket[];
};

export type RemoteInfo = {
  remoteState: RemoteStateInfo;
  remoteItems: RemoteItemInfo[];
};

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

  // TODO: method pour reconstituer remoteContent: Content<SpaceType> from changed files and info in db
  getRemoteContent: (
    localContent: Content<SpaceType>,
    remoteInfo: RemoteInfo
  ) => Promise<{
    remoteContent: Content<SpaceType>;
    remoteState: RemoteStateInfo;
  }>;

  merge: (
    localContent: Content<SpaceType>,
    remoteContent: Content<SpaceType>,
    remoteInfo: RemoteInfo
  ) => Promise<Content<SpaceType>>;

  pull: (
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    // remoteContent: Content<SpaceType>,
    remoteInfo: RemoteInfo,
    force?: boolean
  ) => Promise<{
    content?: Content<SpaceType>;
    remoteInfo: RemoteInfo;
  }>; // pull space from provider
  push: (
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    // remoteContent: Content<SpaceType>,
    remoteInfo: RemoteInfo,
    force?: boolean
  ) => Promise<{ remoteInfo: RemoteInfo }>; // force push space to provider
}
