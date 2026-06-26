import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { LocalChangeResult } from '@/domain/local-changes/model';
import { ParamValues } from 'tinybase/with-schemas';

const fetchLocalChangesQuery = new SpaceQueryDefinition<
  ParamValues,
  LocalChangeResult,
  SpaceTables.LocalChanges
>('fetchLocalChanges', SpaceTables.LocalChanges, ({ select }) => {
  select('on');
  select('itemId');
  select('createdAt');
  select('change');
  select('field');
});

export default fetchLocalChangesQuery;
