import { DocAnnotationRow } from '@/domain/collection/doc-annotations';
import { Id } from 'tinybase/with-schemas';

export type NoteResult = {
  id: Id;
} & Pick<DocAnnotationRow, 'createdAt' | 'order' | 'conflictId'>;
