import { WithId } from '@/core/db/types';
import { DocAnnotationRow } from '@/domain/collection/doc-annotations';

export type CollectionItemConflictResult = WithId<{ conflictId: string }>;
export type AnnotationConflictResult = WithId<
  Pick<DocAnnotationRow, 'itemId' | 'conflictId'>
>;
