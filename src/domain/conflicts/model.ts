import { DocAnnotationRow } from '../document-annotations/model';

export type CollectionItemConflictResult = { conflict: string };
export type AnnotationConflictResult = Pick<
  DocAnnotationRow,
  'itemId' | 'conflict'
>;
