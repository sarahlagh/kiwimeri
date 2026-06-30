import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { ParamValues } from 'tinybase/with-schemas';
import { AnnotationConflictResult } from '../model';

const fetchAnnotsConflictsQuery = new SpaceQueryDefinition<
  ParamValues,
  AnnotationConflictResult,
  SpaceTables.Annotations
>('fetchNoteConflicts', SpaceTables.Annotations, ({ select, where }) => {
  select('itemId');
  select('conflictId');
  where(getCell => getCell('conflictId') !== undefined);
});

export default fetchAnnotsConflictsQuery;
