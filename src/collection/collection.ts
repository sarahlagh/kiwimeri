import { APPICONS } from '@/constants';
import { MetaField } from '@/core/db/types';
import { CollectionItemSettings } from '@/domain/collection-settings/model';

export enum CollectionItemType {
  notebook = 'n',
  folder = 'f',
  document = 'd'
}
export const itemTypes = ['n', 'f', 'd'] as const;
export type CollectionItemTypeValues = (typeof itemTypes)[number];

export interface CollectionItem {
  id?: string;
  itemId: string;
  parent: string;
  parent_meta: MetaField;
  type: CollectionItemTypeValues;
  title: string;
  title_meta: MetaField;
  content?: string;
  content_meta?: MetaField;
  tags?: string[];
  tags_meta?: MetaField;
  created: number;
  updated: number;
  conflict?: string;
  order: number;
  order_meta: MetaField;
  settings?: CollectionItemSettings;
  settings_meta?: MetaField;
}

export type CollectionItemWithId = CollectionItem & { id: string };

export type CollectionItemFieldEnum = keyof Required<
  Omit<CollectionItem, 'id'>
>;

export type CollectionItemUpdatableFieldEnum = keyof Required<
  Pick<
    CollectionItem,
    'parent' | 'title' | 'content' | 'tags' | 'order' | 'settings'
  >
>;

export const CollectionItemUpdatableFields: CollectionItemUpdatableFieldEnum[] =
  ['parent', 'title', 'content', 'tags', 'order', 'settings'];

export const CollectionItemUpdateChangeFields: CollectionItemUpdatableFieldEnum[] =
  ['title', 'content', 'tags', 'settings'];

export const CollectionItemResetConflictFields: CollectionItemUpdatableFieldEnum[] =
  ['parent', 'title', 'content', 'tags'];

export const CollectionItemHistorizableFields: CollectionItemUpdatableFieldEnum[] =
  ['content'];

export type CollectionItemResult = Pick<
  CollectionItem,
  | 'parent'
  | 'title'
  | 'type'
  | 'tags'
  | 'created'
  | 'updated'
  | 'order'
  | 'settings'
  | 'conflict'
> &
  Required<Pick<CollectionItem, 'id'>> & {
    lastOpenedAt?: number;
    preview?: string;
  };

export const CollectionItemUpdatableConflictFields: CollectionItemUpdatableFieldEnum[] =
  ['parent', 'title', 'content'] as const;

export const CollectionItemUpdatableNonConflictFields: CollectionItemUpdatableFieldEnum[] =
  CollectionItemUpdatableFields.filter(
    f => !CollectionItemUpdatableConflictFields.includes(f)
  );

export type CollectionItemUpdate = Pick<
  CollectionItem,
  'content' | 'content_meta' | 'tags_meta' | 'order_meta' | 'settings_meta'
> &
  CollectionItemResult;

export type ItemWithPreview = CollectionItemResult & {
  preview: string;
};

export type SortableCollectionItem = Pick<CollectionItem, 'order'> &
  Required<Pick<CollectionItem, 'id'>>;

export type CollectionItemVersionOp = 'snapshot' | 'deleted';

export type CollectionItemVersionRow = {
  id?: string;
  itemId: string;
  op: CollectionItemVersionOp;
  createdAt: number;
  rank: number; // not ideal when created informs the order, but convenient for the gc query
  contentId: string;
  snapshotJson: Partial<CollectionItemSnapshotData>;
};

export type CollectionItemVersionContentRow = {
  id?: string;
  content: string;
  preview: string;
  hash: number;
};

export type CollectionItemVersion = Omit<
  CollectionItemVersionRow,
  'contentId' | 'snapshotJson'
> &
  CollectionItemVersionContentRow & {
    id: string;
    snapshotJson: CollectionItemSnapshotData;
  };

export type CollectionItemSnapshotData = Pick<
  CollectionItem,
  | 'parent'
  | 'parent_meta'
  | 'title'
  | 'title_meta'
  | 'content_meta'
  | 'tags'
  | 'tags_meta'
  | 'order'
  | 'order_meta'
  | 'settings'
  | 'settings_meta'
  | 'created'
  | 'updated'
> &
  Partial<Pick<CollectionItem, 'order' | 'order_meta'>>;

type isTypeArg =
  | Pick<CollectionItem, 'type'>
  | Pick<CollectionItemResult, 'type'>
  | string
  | null;

const isA = (type: CollectionItemTypeValues, item?: isTypeArg) => {
  if (item && typeof item !== 'string') {
    return item.type === type;
  }
  return item === type;
};

export const isParent = (item?: isTypeArg) =>
  isA(CollectionItemType.folder, item) ||
  isA(CollectionItemType.notebook, item);

export const isFolder = (item?: isTypeArg) =>
  isA(CollectionItemType.folder, item);

export const isNotebook = (item?: isTypeArg) =>
  isA(CollectionItemType.notebook, item);

export const isDocument = (item?: isTypeArg) =>
  isA(CollectionItemType.document, item);

export const APPICONS_PER_TYPE = new Map<CollectionItemTypeValues, string>();
APPICONS_PER_TYPE.set(CollectionItemType.document, APPICONS.document);
APPICONS_PER_TYPE.set(CollectionItemType.folder, APPICONS.folder);
APPICONS_PER_TYPE.set(CollectionItemType.notebook, APPICONS.notebook);
