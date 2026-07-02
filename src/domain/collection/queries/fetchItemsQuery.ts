import { ROOT_COLLECTION } from '@/constants';
import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import {
  CollectionItemResult,
  CollectionItemTypeValues
} from '@/domain/collection/collection';
import { getDerivedId } from '@/domain/collection/derived-content';

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

  join('derived_content', (getCell, itemId) => getDerivedId('c', itemId)).as(
    'content'
  );
  join('derived_item_state', (getCell, itemId) => itemId).as('state');
  select('parentId');
  select('title');
  select('type');
  select('tags');
  select('createdAt');
  select('updatedAt');
  select('order');
  select('conflictId');
  select('settings');
  select('content', 'plainText').as('plainText');
  select('state', 'shortPath').as('breadcrumb');

  where(getCell => getCell('itemId') !== params.parentId);
  if (params.recursive === false) {
    where('parentId', params.parentId);
  } else if (params.parentId !== ROOT_COLLECTION) {
    where(getCell => {
      const fullPath = getCell('state', 'fullPath') as string[];
      return fullPath?.includes(params.parentId);
    });
  }
  if (params.restrictType !== undefined) {
    where('type', params.restrictType);
  }
});

export default fetchItemsQuery;
