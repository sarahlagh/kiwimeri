import {
  CollectionItem,
  CollectionItemType
} from '@/domain/collection/collection';
import { Sort } from '@/shared/misc/sort-filter/sort';

export interface Notebook extends CollectionItem {
  type: CollectionItemType.notebook;
}

export const notebookSortBy = [
  'createdAt',
  'updatedAt',
  'title',
  'order'
] as const;
export type NotebookSortType = (typeof notebookSortBy)[number];

export type NotebookSort = Sort<NotebookSortType>;
