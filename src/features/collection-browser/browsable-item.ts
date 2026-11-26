import { CollectionItem } from '@/domain/collection/collection';
import { LastActivityAt } from '@/domain/collection/derived-item-state';
import { Sort } from '@/shared/misc/sort-filter/sort';

export const browserSortBy = [
  'createdAt',
  'lastActivityAt',
  'title',
  'previewText',
  'order',
  'lastOpenedAt'
] as const;
export type BrowsableItemSortType = (typeof browserSortBy)[number];

export type BrowsableItemSort = Sort<BrowsableItemSortType>;

export type BrowsableItemResult = Pick<
  CollectionItem,
  'parentId' | 'title' | 'type' | 'tags' | 'createdAt' | 'order' | 'conflictId'
> &
  LastActivityAt &
  Required<Pick<CollectionItem, 'id'>> & {
    lastOpenedAt?: number;
    previewText?: string;
  };
