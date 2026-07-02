import { CollectionItem } from '@/domain/collection/collection';
import { CollectionItemSort } from '@/domain/collection/collection-settings';
import { Sort } from '@/shared/misc/sort-filter/sort';

export const browserSortBy = [
  'createdAt',
  'updatedAtRank',
  'title',
  'preview',
  'order',
  'lastOpenedAtRank'
] as const;
export type BrowsableItemSortType = (typeof browserSortBy)[number];

export type BrowsableItemSort = Sort<BrowsableItemSortType>;

export function fromCollectionItemSort(
  sort: CollectionItemSort
): BrowsableItemSort {
  const descending = sort.descending;
  const by = sort.by;
  switch (by) {
    case 'plainText':
      return { by: 'preview', descending };
    case 'updatedAt':
      return { by: 'updatedAtRank', descending };
  }
  return { by, descending };
}

export type BrowsableItemResult = Pick<
  CollectionItem,
  | 'parentId'
  | 'title'
  | 'type'
  | 'tags'
  | 'createdAt'
  | 'order'
  | 'settings'
  | 'conflictId'
> &
  Required<Pick<CollectionItem, 'id'>> & {
    lastOpenedAtRank?: number;
    updatedAtRank?: number;
    preview?: string;
    breadcrumb?: string[];
  };
