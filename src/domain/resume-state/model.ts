import { SerializedSelection } from '@/common/wysiwyg/lexical/selection-serializer';
import { Id } from 'tinybase/with-schemas';

export type DocumentResumeStateRow = {
  lastSelection: SerializedSelection | null;
  lastSelectedNoteId: Id | null;
};

export const resumeStateSchema = {
  lastSelection: { type: 'object' },
  lastSelectedNoteId: { type: 'string' }
} as const satisfies Record<keyof DocumentResumeStateRow, unknown>;

export type DocumentResumeState = DocumentResumeStateRow;
