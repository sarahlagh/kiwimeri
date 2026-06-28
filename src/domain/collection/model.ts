import { APPICONS } from '@/constants';
import { MetaField, metaSchemaDefault, WithId } from '@/core/db/types';
import { CollectionItemSettings } from '@/domain/collection-settings/model';

export type CollectionItemRow = {
  itemId: string;
  parentId: string;
  parentId_meta: MetaField;
  type: CollectionItemTypeValues;
  title: string;
  title_meta: MetaField;
  content?: string;
  content_meta?: MetaField;
  tags?: string[];
  tags_meta?: MetaField;
  createdAt: number;
  updatedAt: number;
  conflictId?: string;
  order: number;
  order_meta: MetaField;
  settings?: CollectionItemSettings;
  settings_meta?: MetaField;
};

export const collectionSchema = {
  itemId: { type: 'string' },
  title: { type: 'string' },
  title_meta: { type: 'object', default: metaSchemaDefault },
  parentId: { type: 'string' },
  parentId_meta: { type: 'object', default: metaSchemaDefault },
  type: { type: 'string' },
  content: { type: 'string' },
  content_meta: { type: 'object' },
  tags: { type: 'array' },
  tags_meta: { type: 'object' },
  createdAt: { type: 'number' },
  updatedAt: { type: 'number' },
  conflictId: { type: 'string' },
  order: { type: 'number' },
  order_meta: { type: 'object' },
  settings: { type: 'object' },
  settings_meta: { type: 'object' }
} as const satisfies Record<keyof CollectionItemRow, unknown>;

export type SyncableItem = WithId<CollectionItemRow>;

////////////////////

export enum CollectionItemType {
  notebook = 'n',
  folder = 'f',
  document = 'd'
}
export const itemTypes = ['n', 'f', 'd'] as const;
export type CollectionItemTypeValues = (typeof itemTypes)[number];

export type CollectionItem = CollectionItemRow & { id?: string };

export type CollectionItemWithId = WithId<CollectionItem>;

export type CollectionItemFieldEnum = keyof Required<
  Omit<CollectionItem, 'id'>
>;

export type CollectionItemUpdatableFieldEnum = keyof Required<
  Pick<
    CollectionItem,
    'parentId' | 'title' | 'content' | 'tags' | 'order' | 'settings'
  >
>;

export const CollectionItemUpdatableFields: CollectionItemUpdatableFieldEnum[] =
  ['parentId', 'title', 'content', 'tags', 'order', 'settings'];

export const CollectionItemUpdateChangeFields: CollectionItemUpdatableFieldEnum[] =
  ['title', 'content', 'tags', 'settings'];

export const CollectionItemResetConflictFields: CollectionItemUpdatableFieldEnum[] =
  ['parentId', 'title', 'content', 'tags'];

export const CollectionItemHistorizableFields: CollectionItemUpdatableFieldEnum[] =
  ['content'];

export type CollectionItemResult = Pick<
  CollectionItem,
  | 'parentId'
  | 'title'
  | 'type'
  | 'tags'
  | 'createdAt'
  | 'updatedAt'
  | 'order'
  | 'settings'
  | 'conflictId'
> &
  Required<Pick<CollectionItem, 'id'>> & {
    lastOpenedAt?: number;
    preview?: string;
    breadcrumb?: string[];
  };

export const CollectionItemUpdatableConflictFields: CollectionItemUpdatableFieldEnum[] =
  ['parentId', 'title', 'content'] as const;

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
  | 'parentId'
  | 'parentId_meta'
  | 'title'
  | 'title_meta'
  | 'content_meta'
  | 'tags'
  | 'tags_meta'
  | 'order'
  | 'order_meta'
  | 'settings'
  | 'settings_meta'
  | 'createdAt'
  | 'updatedAt'
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
