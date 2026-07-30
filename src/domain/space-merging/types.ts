import {
  CollectionItemType,
  CollectionItemUpdatableFieldEnum
} from '@/domain/collection/collection';
import { DocAnnotationType } from '@/domain/collection/document-annotations';
import {
  LocalChangeOn,
  LocalChangeType
} from '@/domain/synchronization/local-changes';
import { Id } from 'tinybase/with-schemas';

export type AfterMergeChange = {
  id: Id;
  type: CollectionItemType | DocAnnotationType;
  change: LocalChangeType;
  on: LocalChangeOn;
  field?: CollectionItemUpdatableFieldEnum;
};
