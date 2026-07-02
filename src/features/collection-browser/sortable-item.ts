import { CollectionItem } from '@/domain/collection/collection';
import { Sort } from '@/shared/misc/sort-filter/sort';

export const browserSortBy = [
  'createdAt',
  'updatedAt',
  'title',
  'plainText',
  'order'
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
  | 'settings'
  | 'conflictId'
> &
  Required<Pick<CollectionItem, 'id'>> & {
    lastOpenedAt?: number;
    plainText?: string;
    breadcrumb?: string[];
  };
