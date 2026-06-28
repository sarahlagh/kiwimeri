import { DocAnnotationRow } from '@/domain/document-annotations/model';
import { Id } from 'tinybase/with-schemas';

export type NoteResult = {
  id: Id;
} & Pick<DocAnnotationRow, 'createdAt' | 'order' | 'conflictId'>;
