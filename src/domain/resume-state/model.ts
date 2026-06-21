import { SerializedSelection } from '@/common/wysiwyg/lexical/selection-serializer';
import { Id } from 'tinybase/with-schemas';

export type DocumentResumeStateRow = {
  lastSelection: SerializedSelection | null;
  lastSelectedNoteId: Id | null;
};

export type CollectionResumeStateRow = DocumentResumeStateRow;

export const resumeStateSchema = {
  lastSelection: { type: 'object' },
  lastSelectedNoteId: { type: 'string' }
} as const satisfies Record<keyof CollectionResumeStateRow, unknown>;

export type DocumentResumeState = DocumentResumeStateRow;
