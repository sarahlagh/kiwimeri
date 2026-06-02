import {
  CollectionItemResult,
  CollectionItemType
} from '@/collection/collection';
import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { store } from '@/core/db/store';
import { conflictsService } from '@/domain/conflicts/conflicts-service';
import { getAncestorId } from '@/search/search-ancestry.service';

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
    const { itemsConflicts, annotsConflicts } = conflictsService.getConflicts();
    where(getCell => {
      const id = getCell('itemId')!;
      const isConflict = getCell('conflict') !== undefined;
      const { hasConflict, hasAnnotsConflicts: hasNoteConflicts } =
        conflictsService.itemHasConflicts(id, itemsConflicts, annotsConflicts);
      return isConflict || hasConflict || hasNoteConflicts;
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
  if (params.onlyDocuments) {
    where('type', CollectionItemType.document);
  }
});

export type FetchItemsQuery = typeof fetchItemsQuery;
export default fetchItemsQuery;
