import { CollectionItem, CollectionItemType } from '@/domain/collection/model';

export interface Notebook extends CollectionItem {
  id?: string;
  type: CollectionItemType.notebook;
}

export type NotebookResult = Pick<
  Notebook,
  'parentId' | 'title' | 'type' | 'createdAt' | 'updatedAt' | 'order'
> &
  Required<Pick<Notebook, 'id'>>;
