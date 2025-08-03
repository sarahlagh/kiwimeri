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
  preview?: string;
  tags?: string;
  tags_meta?: string;
  created: number;
  updated: number;
  deleted: boolean;
  deleted_meta: string;
  conflict?: string;
  display_opts?: string;
  display_opts_meta?: string;
}

export type CollectionItemFieldEnum = keyof Required<
  Omit<CollectionItem, 'id'>
>;

export type CollectionItemUpdatableFieldEnum = keyof Required<
  Pick<
    CollectionItem,
    'parent' | 'title' | 'content' | 'tags' | 'deleted' | 'display_opts'
  >
>;
export const CollectionItemUpdatableFields: CollectionItemFieldEnum[] = [
  'parent',
  'title',
  'content',
  'tags',
  'deleted',
  'display_opts'
];

export type CollectionItemResult = Pick<
  CollectionItem,
  | 'parent'
  | 'title'
  | 'type'
  | 'tags'
  | 'created'
  | 'updated'
  | 'deleted'
  | 'conflict'
  | 'preview'
> &
  Required<Pick<CollectionItem, 'id'>>;

export type CollectionItemUpdate = Pick<
  CollectionItem,
  'content' | 'content_meta' | 'tags_meta'
> &
  CollectionItemResult;

export type PagePreview = Pick<
  CollectionItem,
  'preview' | 'created' | 'updated' | 'conflict'
> &
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
