import {
  CollectionItemResult,
  CollectionItemType
} from '@/collection/collection';
import storageService from '@/db/storage.service';
import { getAncestorId } from '@/search/search-ancestry.service';
import { SpaceQueryDefinition } from './queries-helper';

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
  where('deleted', false);
  if (param('recursive')?.valueOf() === false) {
    if (param('parent')) {
      where('parent', param('parent')!.toString());
    }
  } else {
    where(getCell => {
      const parent = param('parent')!.toString();
      // i'm saved here because stats do have itemId
      // but in next table model, include it in collection table too
      const id = getCell('stats', 'itemId')?.toString();
      if (!id) return false;
      return ancestry[`${getAncestorId(id, parent)}`] !== undefined;
    });
  }
  where(getCell => {
    const type = getCell('type')?.valueOf();
    const onlyDocuments = param('onlyDocuments')?.valueOf() as boolean;
    if (onlyDocuments) {
      return type === CollectionItemType.document;
    }
    return type !== CollectionItemType.page;
  });
});

export type FetchItemsQuery = typeof fetchItemsQuery;
export default fetchItemsQuery;
