import { WithId } from '@/core/db/types';
import { DocAnnotationRow } from '@/domain/collection/document-annotations';

export type CollectionItemConflictResult = WithId<{ conflictId: string }>;
export type AnnotationConflictResult = WithId<
  Pick<DocAnnotationRow, 'parentId' | 'conflictId'>
>;
