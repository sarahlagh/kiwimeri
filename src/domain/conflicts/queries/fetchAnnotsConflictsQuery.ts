import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { DOC_ANNOTATION_TABLE } from '@/domain/document-annotations/model';
import { ParamValues } from 'tinybase/with-schemas';
import { AnnotationConflictResult } from '../model';

const fetchAnnotsConflictsQuery = new SpaceQueryDefinition<
  ParamValues,
  AnnotationConflictResult,
  'document_annotation'
>('fetchNoteConflicts', DOC_ANNOTATION_TABLE, ({ select, where }) => {
  select('itemId');
  select('conflict');
  where(getCell => getCell('conflict') !== undefined);
});

export default fetchAnnotsConflictsQuery;
