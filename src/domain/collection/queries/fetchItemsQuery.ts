import { ROOT_COLLECTION } from '@/constants';
import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import {
  CollectionItemResult,
  CollectionItemTypeValues
} from '@/domain/collection/collection';

export type FetchItemsQueryParam = {
  parentId: string;
  recursive?: boolean;
  restrictType?: CollectionItemTypeValues;
};

const fetchItemsQuery = new SpaceQueryDefinition<
  FetchItemsQueryParam,
  CollectionItemResult,
  SpaceTables.Collection
>('fetchItems', SpaceTables.Collection, ({ select, where, param, join }) => {
  const params: FetchItemsQueryParam = {
    parentId: param('parentId') as string,
    recursive: param('recursive') as boolean,
    restrictType: param('restrictType') as CollectionItemTypeValues
  };
  if (params.recursive === undefined) params.recursive = false;

  join(SpaceTables.CollectionItemView, (getCell, itemId) => itemId).as(
    'content'
  );
  join(SpaceTables.ProjectedState, (getCell, itemId) => itemId).as('state');
  select('parentId');
  select('title');
  select('type');
  select('tags');
  select('createdAt');
  select('updatedAt');
  select('state', 'lastActivityAt');
  select('order');
  select('conflictId');
  select('settings');
  select('content', 'previewText');

  if (params.parentId !== ROOT_COLLECTION || !params.recursive) {
    where(getCell => {
      const parentId = getCell('parentId') as string;
      const fullPath = getCell('state', 'fullPath') as string[];
      if (!fullPath) return false; // shouldn't happen
      if (fullPath[fullPath.length - 1] === params.parentId) return false; // never return self
      if (!params.recursive) {
        return parentId === params.parentId;
      }
      return fullPath.includes(params.parentId);
    });
  }
  if (params.restrictType !== undefined) {
    where('type', params.restrictType);
  }
});

export default fetchItemsQuery;
