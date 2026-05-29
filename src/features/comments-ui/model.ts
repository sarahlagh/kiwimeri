import { DocAnnotationRow } from '@/domain/document-annotations/model';
import { Id } from 'tinybase/with-schemas';

export type CommentResult = {
  id: Id;
} & Pick<DocAnnotationRow, 'createdAt' | 'order' | 'conflict'>;
