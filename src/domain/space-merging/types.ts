import {
  BaseCollectionItem,
  CollectionItemType,
  CollectionItemUpdatableFieldEnum
} from '@/domain/collection/collection';
import {
  BaseDocAnnotation,
  DocAnnotationType
} from '@/domain/collection/document-annotations';
import {
  LocalChangeOn,
  LocalChangeType
} from '@/domain/synchronization/local-changes';
import { Id } from 'tinybase/with-schemas';
import { BaseUserPreference } from '../user-preferences/user-preferences';

export type TableOf<T> = {
  [key: Id]: T;
};

export type SpacePortableData = {
  items: TableOf<BaseCollectionItem>;
  annots: TableOf<BaseDocAnnotation>;
  userPrefs: TableOf<BaseUserPreference>;
  lastChange: number;
  schemaVersion: number;
};

export type SpacePortableDataKey = Exclude<
  keyof SpacePortableData,
  'lastChange' | 'schemaVersion'
>;

export type SpacePortableDataTableType<K extends SpacePortableDataKey> =
  K extends 'items'
    ? BaseCollectionItem
    : K extends 'annots'
      ? BaseDocAnnotation
      : BaseUserPreference;

export type AfterMergeChange = {
  id: Id;
  type: CollectionItemType | DocAnnotationType;
  change: LocalChangeType;
  on: LocalChangeOn;
  field?: CollectionItemUpdatableFieldEnum;
};
