export enum CollectionItemType {
  folder = 'f',
  document = 'd',
  page = 'p'
}

export type CollectionItemTypeValues = 'f' | 'd' | 'p';

export interface CollectionItem {
  id?: string;
  parent: string;
  type: CollectionItemTypeValues;
  title: string;
  content?: string;
  created: number;
  updated: number;
  deleted: boolean;
  conflict?: string;
}

export type CollectionItemFieldEnum = keyof Required<
  Omit<CollectionItem, 'id'>
>;

export type CollectionItemUpdatableFieldEnum = keyof Required<
  Pick<CollectionItem, 'parent' | 'title' | 'content' | 'deleted'>
>;

export type CollectionItemResult = Required<
  Pick<
    CollectionItem,
    'id' | 'parent' | 'title' | 'type' | 'created' | 'updated' | 'deleted'
  >
>;
