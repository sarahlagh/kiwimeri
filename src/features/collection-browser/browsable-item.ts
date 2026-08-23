import { CollectionItem } from '@/domain/collection/collection';
import { Sort } from '@/shared/misc/sort-filter/sort';

export const browserSortBy = [
  'createdAt',
  'updatedAt',
  'title',
  'previewText',
  'order',
  'lastOpenedAt'
] as const;
export type BrowsableItemSortType = (typeof browserSortBy)[number];

export type BrowsableItemSort = Sort<BrowsableItemSortType>;

export type BrowsableItemResult = Pick<
  CollectionItem,
  | 'parentId'
  | 'title'
  | 'type'
  | 'tags'
  | 'createdAt'
  | 'updatedAt'
  | 'order'
  | 'conflictId'
> &
  Required<Pick<CollectionItem, 'id'>> & {
    lastOpenedAt?: number;
    previewText?: string;
    breadcrumb?: string[];
  };
