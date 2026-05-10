import { SerializedSelection } from '@/common/wysiwyg/lexical/selection-serializer';
import { Id } from 'tinybase/with-schemas';

export type DocumentResumeStateRow = {
  lastSelection: SerializedSelection | null;
  lastSelectedCommentId: Id | null;
};

export const resumeStateSchema = {
  lastSelection: { type: 'object', allowNull: true },
  lastSelectedCommentId: { type: 'string', allowNull: true }
} as const satisfies Record<keyof DocumentResumeStateRow, unknown>;

export type DocumentResumeState = DocumentResumeStateRow;
