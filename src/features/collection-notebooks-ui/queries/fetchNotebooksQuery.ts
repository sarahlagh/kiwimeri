import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { WithId } from '@/core/db/types';
import { CollectionItemType } from '@/domain/collection/collection';
import { Notebook } from '@/domain/collection/notebooks';

export type FetchNotebooksQueryParam = {
  parentId: string;
};

export type NotebookResult = WithId<
  Pick<
    Notebook,
    'parentId' | 'title' | 'type' | 'createdAt' | 'updatedAt' | 'order'
  >
>;

const fetchNotebooksQuery = new SpaceQueryDefinition<
  FetchNotebooksQueryParam,
  NotebookResult,
  SpaceTables.Collection
>('fetchNotebooks', SpaceTables.Collection, ({ select, where, param }) => {
  const params: FetchNotebooksQueryParam = {
    parentId: param('parentId') as string
  };

  select('parentId');
  select('title');
  select('type');
  select('createdAt');
  select('updatedAt');
  select('order');

  where(getCell => getCell('itemId') !== params.parentId);
  where('parentId', params.parentId);
  where('type', CollectionItemType.notebook);
});

export default fetchNotebooksQuery;
