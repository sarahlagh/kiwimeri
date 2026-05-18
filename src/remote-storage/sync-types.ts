import {
  CollectionItem,
  CollectionItemUpdatableFieldEnum
} from '@/collection/collection';
import { RemoteState } from '@/db/types/store-types';
import { LocalChangeOn, LocalChangeType } from '@/domain/local-changes/model';

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
  on: LocalChangeOn;
  field?: CollectionItemUpdatableFieldEnum;
};
