import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { WithId } from '@/core/db/types';
import { CollectionItemType } from '@/domain/collection/collection';
import { LastActivityAt } from '@/domain/collection/derived-item-state';
import { Notebook } from '@/domain/collection/notebooks';

export type FetchNotebooksQueryParam = {
  parentId: string;
};

export type NotebookResult = WithId<
  Pick<Notebook, 'parentId' | 'title' | 'type' | 'createdAt' | 'order'>
> &
  LastActivityAt;

const fetchNotebooksQuery = new SpaceQueryDefinition<
  FetchNotebooksQueryParam,
  NotebookResult,
  SpaceTables.Collection
>(
  'fetchNotebooks',
  SpaceTables.Collection,
  ({ select, where, param, join }) => {
    const params: FetchNotebooksQueryParam = {
      parentId: param('parentId') as string
    };

    join(SpaceTables.ProjectedState, (getCell, itemId) => itemId).as('state');
    select('parentId');
    select('title');
    select('type');
    select('createdAt');
    select('state', 'lastActivityAt').as('lastActivityAt');
    select('order');

    where(getCell => {
      const fullPath = getCell('state', 'fullPath') as string[];
      if (!fullPath) return false;
      return fullPath[fullPath.length - 1] !== params.parentId; // last id is the item id
    });
    where('parentId', params.parentId);
    where('type', CollectionItemType.notebook);
  }
);

export default fetchNotebooksQuery;
