import { Sort } from '@/shared/utils/sort-filter/sort';

// sort

export const docSortBy = [
  'createdAt',
  'updatedAt',
  'title',
  'preview',
  'order'
] as const;
export type CollectionItemSortType = (typeof docSortBy)[number];

export type CollectionItemSort = {
  by: CollectionItemSortType;
  descending: boolean;
};

export const annotSortBy = ['createdAt', 'order'] as const;
export type NotesSortType = (typeof annotSortBy)[number];
export type NotesSort = Sort<NotesSortType>;

// settings

export type CollectionItemSettings = Partial<NotebookSettings> &
  Partial<FolderSettings> &
  Partial<DocumentSettings>;

export type NotebookSettings = FolderSettings & {
  browserMode?: number;
};

export type FolderSettings = {
  statsEnabled?: boolean;
  sort?: CollectionItemSort;
};

export type DocumentSettings = {
  documentSort?: NotesSort;
};

export type SpaceSettings = Required<Omit<NotebookSettings, 'browserMode'>>;
