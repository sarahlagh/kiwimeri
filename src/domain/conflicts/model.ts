import { CommentRow } from '../comments/model';

export type CommentConflictResult = Pick<CommentRow, 'itemId' | 'conflict'>;
