import { APPICONS } from '@/constants';
import { MetaField } from '@/core/db/types';
import { NotesSort } from '@/domain/document-annotations/model';
import { AnyObject } from 'tinybase/with-schemas';

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
  display_opts?: CollectionItemDisplayOpts;
  display_opts_meta?: MetaField;
  flags?: CollectionItemFlags;
  flags_meta?: MetaField;
}

export type CollectionItemWithId = CollectionItem & { id: string };

export const sortBy = [
  'created',
  'updated',
  'title',
  'preview',
  'order'
] as const;
export type CollectionItemSortType = (typeof sortBy)[number];

export type CollectionItemSort = {
  by: CollectionItemSortType;
  descending: boolean;
};

export type CollectionItemDisplayOpts = Partial<NotebookDisplayOpts> &
  Partial<FolderDisplayOpts> &
  Partial<DocumentDisplayOpts>;

export type NotebookDisplayOpts = FolderDisplayOpts & {
  lastBrowserMode?: number;
};

export type FolderDisplayOpts = {
  sort: CollectionItemSort;
};

export type DocumentDisplayOpts = {
  documentSort: NotesSort;
};

export interface CollectionItemFlags extends AnyObject {
  statsEnabled?: boolean;
}

export const defaultFlags: Required<CollectionItemFlags> = {
  statsEnabled: false
};

export type CollectionItemFieldEnum = keyof Required<
  Omit<CollectionItem, 'id'>
>;

export type CollectionItemUpdatableFieldEnum = keyof Required<
  Pick<
    CollectionItem,
    'parent' | 'title' | 'content' | 'tags' | 'order' | 'display_opts' | 'flags'
  >
>;

export const CollectionItemUpdatableFields: CollectionItemUpdatableFieldEnum[] =
  ['parent', 'title', 'content', 'tags', 'order', 'display_opts', 'flags'];

export const CollectionItemUpdateChangeFields: CollectionItemUpdatableFieldEnum[] =
  ['title', 'content', 'tags', 'display_opts', 'flags'];

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
  | 'display_opts'
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
  | 'content'
  | 'content_meta'
  | 'tags_meta'
  | 'order_meta'
  | 'display_opts_meta'
  | 'flags_meta'
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
  | 'display_opts'
  | 'display_opts_meta'
  | 'flags'
  | 'flags_meta'
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
