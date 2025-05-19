import { CollectionItem, CollectionItemType } from '@/collection/collection';

export interface Notebook extends CollectionItem {
  id?: string;
  type: CollectionItemType.notebook;
}

export type NotebookResult = Pick<
  Notebook,
  'parent' | 'title' | 'type' | 'created' | 'updated' | 'deleted'
> &
  Required<Pick<Notebook, 'id'>>;
