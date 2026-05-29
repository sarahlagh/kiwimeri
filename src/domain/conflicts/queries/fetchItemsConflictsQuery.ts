import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { ParamValues } from 'tinybase/with-schemas';
import { CollectionItemConflictResult } from '../model';

const fetchItemsConflictsQuery = new SpaceQueryDefinition<
  ParamValues,
  CollectionItemConflictResult,
  'collection'
>('fetchItemsConflictsQuery', 'collection', ({ select, where }) => {
  select('conflict');
  where(getCell => getCell('conflict') !== undefined);
});

export default fetchItemsConflictsQuery;
