import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { ParamValues } from 'tinybase/with-schemas';

const fetchItemsConflictsQuery = new SpaceQueryDefinition<
  ParamValues,
  { conflict: string },
  'collection'
>('fetchItemsConflictsQuery', 'collection', ({ select, where }) => {
  select('conflict');
  where(getCell => getCell('conflict') !== undefined);
});

export default fetchItemsConflictsQuery;
