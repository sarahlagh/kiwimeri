import { CommentRow } from '../comments/model';

export type CollectionItemConflictResult = { conflict: string };
export type CommentConflictResult = Pick<CommentRow, 'itemId' | 'conflict'>;
