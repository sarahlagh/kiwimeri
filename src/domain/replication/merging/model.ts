import {
  CollectionItem,
  CollectionItemUpdatableFieldEnum
} from '@/collection/collection';
import { LocalChangeOn, LocalChangeType } from '@/domain/local-changes/model';

export type AfterSyncChange = Pick<
  Required<CollectionItem>,
  'id' | 'type' | 'parent'
> & {
  change: LocalChangeType;
  on: LocalChangeOn;
  field?: CollectionItemUpdatableFieldEnum;
};
