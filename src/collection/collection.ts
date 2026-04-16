import { SerializedSelection } from '@/common/wysiwyg/lexical/selection-serializer';

export enum CollectionItemType {
  notebook = 'n',
  folder = 'f',
  document = 'd',
  page = 'p'
}

export type CollectionItemTypeValues = 'n' | 'f' | 'd' | 'p';

export interface CollectionItem {
  id?: string;
  parent: string;
  parent_meta: string;
  type: CollectionItemTypeValues;
  title: string;
  title_meta: string;
  content?: string;
  content_meta?: string;
  tags?: string;
  tags_meta?: string;
  created: number;
  updated: number;
  deleted: boolean; // TODO remove
  deleted_meta: string;
  conflict?: string;
  order: number;
  order_meta: string;
  display_opts?: string;
  display_opts_meta?: string;
}

export type DocumentResumeStateRow = {
  itemId: string;
  lastSelection: string | null; // SerializedSelection
};

export type DocumentResumeState = Omit<
  DocumentResumeStateRow,
  'lastSelection'
> & {
  id: string;
  lastSelection: SerializedSelection | null;
};

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

export interface CollectionItemDisplayOpts {
  sort: CollectionItemSort;
  statsEnabled: boolean; // TODO not the right place for this, but pending code reorga
}

export type CollectionItemFieldEnum = keyof Required<
  Omit<CollectionItem, 'id'>
>;

export type CollectionItemUpdatableFieldEnum = keyof Required<
  Pick<
    CollectionItem,
    | 'parent'
    | 'title'
    | 'content'
    | 'tags'
    | 'deleted' // TODO remove
    | 'order'
    | 'display_opts'
  >
>;

export const CollectionItemUpdatableFields: CollectionItemUpdatableFieldEnum[] =
  ['parent', 'title', 'content', 'tags', 'deleted', 'order', 'display_opts'];

export const CollectionItemUpdateChangeFields: CollectionItemUpdatableFieldEnum[] =
  ['title', 'content', 'tags', 'deleted', 'display_opts'];

export const CollectionItemResetConflictFields: CollectionItemUpdatableFieldEnum[] =
  ['parent', 'title', 'content', 'tags', 'deleted'];

export type CollectionItemResult = Pick<
  CollectionItem,
  | 'parent'
  | 'title'
  | 'type'
  | 'tags'
  | 'created'
  | 'updated'
  | 'deleted'
  | 'order'
  | 'display_opts'
  | 'conflict'
> &
  Required<Pick<CollectionItem, 'id'>>;

export const CollectionItemUpdatableConflictFields: CollectionItemUpdatableFieldEnum[] =
  ['parent', 'title', 'content', 'deleted'] as const;

export const CollectionItemUpdatableNonConflictFields: CollectionItemUpdatableFieldEnum[] =
  CollectionItemUpdatableFields.filter(
    f => !CollectionItemUpdatableConflictFields.includes(f)
  );

export type CollectionItemUpdate = Pick<
  CollectionItem,
  'content' | 'content_meta' | 'tags_meta' | 'order_meta' | 'display_opts_meta'
> &
  CollectionItemResult;

export type PageResult = CollectionItemResult & {
  preview: string;
};

export type SortableCollectionItem = Pick<CollectionItem, 'order'> &
  Required<Pick<CollectionItem, 'id'>>;

export type CollectionItemFieldMetadata = {
  u: number;
};

export const setFieldMeta = (value: string, updated: number) => {
  return JSON.stringify({ u: updated });
};

export const parseFieldMeta = (value: string): CollectionItemFieldMetadata => {
  return JSON.parse(value);
};

export type CollectionItemVersionOp = 'snapshot' | 'deleted';

export type CollectionItemVersionRow = {
  id?: string;
  itemId: string;
  op: CollectionItemVersionOp;
  createdAt: number;
  rank: number; // not ideal when created informs the order, but needed for the get latest pages query
  contentId: string;
  /** CollectionItemSnapshotData */
  snapshotJson: string;
  /** array of HistorizedCollectionPageVersion */
  pageVersionsArrayJson?: string;
};

export type CollectionItemVersionContentRow = {
  id?: string;
  content: string;
  preview: string;
  hash: number;
};

export type CollectionItemVersion = Omit<
  CollectionItemVersionRow,
  'contentId' | 'snapshotJson' | 'pageVersionsArrayJson'
> &
  CollectionItemVersionContentRow & {
    id: string;
    snapshotJson: CollectionItemSnapshotData;
    pageVersionsArrayJson?: CollectionPageVersionData[];
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
  | 'deleted'
  | 'deleted_meta'
  | 'order'
  | 'order_meta'
  | 'display_opts'
  | 'display_opts_meta'
  | 'created'
  | 'updated'
> &
  Partial<Pick<CollectionItem, 'order' | 'order_meta'>>;

export type CollectionPageVersionData = {
  id: string;
  itemId: string;
  createdAt: number;
};

export const isDocument = (
  item?:
    | Pick<CollectionItem, 'type'>
    | Pick<CollectionItemResult, 'type'>
    | null
) => item?.type === CollectionItemType.document;

export const isPage = (
  item?:
    | Pick<CollectionItem, 'type'>
    | Pick<CollectionItemResult, 'type'>
    | null
) => item?.type === CollectionItemType.page;

export const isPageOrDocument = (
  item?:
    | Pick<CollectionItem, 'type'>
    | Pick<CollectionItemResult, 'type'>
    | null
) => isDocument(item) || isPage(item);
