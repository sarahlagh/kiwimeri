import { NotesSort } from '../document-annotations/model';

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

export type CollectionItemDisplayOpts = Partial<NotebookDisplayOpts> &
  Partial<FolderDisplayOpts> &
  Partial<DocumentDisplayOpts>;

export type NotebookDisplayOpts = FolderDisplayOpts & {
  lastBrowserMode?: number;
};

export type FolderDisplayOpts = {
  sort: CollectionItemSort;
};

export type DocumentDisplayOpts = {
  documentSort: NotesSort;
};
