import {
  CollectionItemResult,
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import storageService from '@/db/storage.service';
import { getAncestorId } from '@/search/search-ancestry.service';
import { SpaceQueryDefinition } from '../../../core/db/queries-helper';

export type FetchItemsQueryParam = {
  parent: string;
  recursive: boolean;
  onlyDocuments: boolean; // TODO more flexible filter
};

const fetchItemsQuery = new SpaceQueryDefinition<
  FetchItemsQueryParam,
  CollectionItemResult,
  'collection'
>('fetchItems', 'collection', ({ select, where, param, join }) => {
  const ancestry = storageService.getStore().getTable('ancestors');
  const search = storageService.getStore().getTable('search');
  const params: FetchItemsQueryParam = {
    parent: param('parent') as string,
    recursive: param('recursive') as boolean,
    onlyDocuments: param('onlyDocuments') as boolean
  };

  // works but only because stats and collection have same id for global stats
  join('stats', (getCell, itemId) => itemId).as('stats');
  select('stats', 'lastOpenedAt');
  select('parent');
  select('title');
  select('type');
  select('tags');
  select('created');
  select('updated');
  select('deleted');
  select('order');
  select('conflict');
  select('display_opts');
  select(getCell => {
    const id = getCell('itemId')?.toString();
    if (!id) return undefined;
    return search[id]?.contentPreview;
  }).as('preview');

  where('deleted', false);
  if (params.recursive === false) {
    where('parent', params.parent);
  } else {
    where(getCell => {
      const id = getCell('itemId')?.toString();
      if (!id) return false;
      return ancestry[`${getAncestorId(id, params.parent)}`] !== undefined;
    });
  }
  where(getCell => {
    const type = getCell('type') as CollectionItemTypeValues;
    if (params.onlyDocuments) {
      return type === CollectionItemType.document;
    }
    return type !== CollectionItemType.page;
  });
});

export type FetchItemsQuery = typeof fetchItemsQuery;
export default fetchItemsQuery;
