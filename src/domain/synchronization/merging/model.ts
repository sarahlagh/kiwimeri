import {
  CollectionItem,
  CollectionItemUpdatableFieldEnum
} from '@/domain/collection/collection';
import {
  LocalChangeOn,
  LocalChangeType
} from '@/domain/synchronization/local-changes/model';

export type AfterSyncChange = Pick<
  Required<CollectionItem>,
  'id' | 'type' | 'parentId'
> & {
  change: LocalChangeType;
  on: LocalChangeOn;
  field?: CollectionItemUpdatableFieldEnum;
};
