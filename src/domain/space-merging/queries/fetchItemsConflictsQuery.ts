import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { ParamValues } from 'tinybase/with-schemas';
import { CollectionItemConflictResult } from '../conflicts';

const fetchItemsConflictsQuery = new SpaceQueryDefinition<
  ParamValues,
  CollectionItemConflictResult,
  'collection'
>('fetchItemsConflictsQuery', SpaceTables.Collection, ({ select, where }) => {
  select('conflictId');
  where(getCell => getCell('conflictId') !== undefined);
});

export default fetchItemsConflictsQuery;
