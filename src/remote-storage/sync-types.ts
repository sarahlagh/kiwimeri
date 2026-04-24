import {
  CollectionItem,
  CollectionItemUpdatableFieldEnum
} from '@/collection/collection';
import { LocalChangeType, RemoteState } from '@/db/types/store-types';

export type UpdatedRemoteState = {
  lastPulled: number;
} & RemoteState;

export type DriverFileInfo = {
  providerid: string;
  filename: string;
  updated: number;
  hash?: string;
  size?: number;
};

export type AfterSyncHistChange = Pick<
  Required<CollectionItem>,
  'id' | 'type' | 'parent'
> & {
  change: LocalChangeType;
  field?: CollectionItemUpdatableFieldEnum;
};
