import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { ParamValues } from 'tinybase/with-schemas';
import { AnnotationConflictResult } from '../model';

const fetchAnnotsConflictsQuery = new SpaceQueryDefinition<
  ParamValues,
  AnnotationConflictResult,
  'document_annotation'
>('fetchNoteConflicts', SpaceTables.Annotations, ({ select, where }) => {
  select('itemId');
  select('conflict');
  where(getCell => getCell('conflict') !== undefined);
});

export default fetchAnnotsConflictsQuery;
