export enum CollectionItemType {
  folder = 'f',
  document = 'd',
  page = 'p'
}

export type CollectionItemTypeValues = 'f' | 'd' | 'p';

export interface CollectionItem {
  id?: string;
  parent: string;
  parent_meta: string;
  type: CollectionItemTypeValues;
  title: string;
  title_meta: string;
  content?: string;
  content_meta?: string;
  created: number;
  updated: number;
  deleted: boolean;
  deleted_meta: string;
  conflict?: string;
}

export type CollectionItemFieldEnum = keyof Required<
  Omit<CollectionItem, 'id'>
>;

export type CollectionItemUpdatableFieldEnum = keyof Required<
  Pick<CollectionItem, 'parent' | 'title' | 'content' | 'deleted'>
>;

export type CollectionItemResult = Pick<
  CollectionItem,
  'parent' | 'title' | 'type' | 'created' | 'updated' | 'deleted' | 'conflict'
> &
  Required<Pick<CollectionItem, 'id'>>;
