import {
  CollectionItem,
  CollectionItemUpdatableFieldEnum
} from '@/domain/collection/model';
import { LocalChangeOn, LocalChangeType } from '@/domain/local-changes/model';

export type AfterSyncChange = Pick<
  Required<CollectionItem>,
  'id' | 'type' | 'parentId'
> & {
  change: LocalChangeType;
  on: LocalChangeOn;
  field?: CollectionItemUpdatableFieldEnum;
};
