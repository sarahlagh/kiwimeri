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
  created: number;
  updated: number;
  deleted: boolean;
}

export type CollectionItemResult = Required<
  Pick<
    CollectionItem,
    'id' | 'parent' | 'title' | 'type' | 'created' | 'updated' | 'deleted'
  >
>;
