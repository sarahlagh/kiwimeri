import {
  CollectionItemResult,
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { store } from '@/core/db/store';
import fetchCommentConflictsQuery from '@/domain/comments/queries/fetchCommentConflictsQuery';
import { getAncestorId } from '@/search/search-ancestry.service';
import fetchItemsConflictsQuery from './fetchItemsConflictsQuery';

export type FetchItemsQueryParam = {
  parent: string;
  recursive: boolean;
  onlyDocuments: boolean; // TODO more flexible filter
  onlyConflicts: boolean;
};

const fetchItemsQuery = new SpaceQueryDefinition<
  FetchItemsQueryParam,
  CollectionItemResult,
  'collection'
>('fetchItems', 'collection', ({ select, where, param, join }) => {
  const ancestry = store.getTable('ancestors');
  const search = store.getTable('search');
  const params: FetchItemsQueryParam = {
    parent: param('parent') as string,
    recursive: param('recursive') as boolean,
    onlyDocuments: param('onlyDocuments') as boolean,
    onlyConflicts: param('onlyConflicts') as boolean
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
    if (!search[id]?.contentPreview) return undefined;
    return search[id].contentPreview as string;
  }).as('preview');

  if (params.onlyConflicts) {
    // !! not reactive if conflicts are solved
    const itemsConflicts = fetchItemsConflictsQuery.getResults({});
    const commentConflicts = fetchCommentConflictsQuery.getResults({});
    select(getCell => {
      const id = getCell('itemId')!;
      return (
        commentConflicts.filter(
          c => c.itemId === id && c.conflict !== undefined
        ).length > 0
      );
    }).as('hasConflictInComments');
    where(getCell => {
      const id = getCell('itemId')!;
      const isConflict = getCell('conflict') !== undefined;
      const hasConflict =
        itemsConflicts.filter(c => c.conflict === id).length > 0;
      const hasConflictInComments =
        commentConflicts.filter(
          c => c.itemId === id && c.conflict !== undefined
        ).length > 0;
      return isConflict || hasConflict || hasConflictInComments;
    });
  }

  where('deleted', false);
  if (params.recursive === false) {
    where('parent', params.parent);
  } else {
    where(getCell => {
      const id = getCell('itemId');
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
