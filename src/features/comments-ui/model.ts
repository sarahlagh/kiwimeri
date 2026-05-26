import { CommentRow } from '@/domain/comments/model';
import { Id } from 'tinybase/with-schemas';

export type CommentResult = {
  id: Id;
} & Pick<CommentRow, 'createdAt' | 'order' | 'conflict'>;
