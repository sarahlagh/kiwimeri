import { WithId } from '@/core/db/types';
import { DocAnnotationRow } from '../document-annotations/model';

export type CollectionItemConflictResult = WithId<{ conflict: string }>;
export type AnnotationConflictResult = WithId<
  Pick<DocAnnotationRow, 'itemId' | 'conflict'>
>;
