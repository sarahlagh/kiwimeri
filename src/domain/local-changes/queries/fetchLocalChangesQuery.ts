import { LocalChangeResult } from '@/domain/local-changes/model';
import { ParamValues } from 'tinybase/with-schemas';
import { StoreQueryDefinition } from '../../../core/db/queries-helper';

const fetchLocalChangesQuery = new StoreQueryDefinition<
  ParamValues,
  LocalChangeResult,
  'localChanges'
>('fetchLocalChanges', 'localChanges', ({ select }) => {
  select('on');
  select('itemId');
  select('createdAt');
  select('change');
  select('field');
});

export default fetchLocalChangesQuery;
