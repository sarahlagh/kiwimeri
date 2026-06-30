import { SerializedSelection } from '@/common_to_migrate/wysiwyg/lexical/selection-serializer';
import { Id } from 'tinybase/with-schemas';

export type DocumentResumeState = {
  lastSelection: SerializedSelection | null;
  lastSelectedNoteId: Id | null;
};

export type NotebookResumeState = {
  lastFolder?: Id;
  lastDocument?: Id;
};

export type CollectionResumeStateRow = DocumentResumeState &
  NotebookResumeState;

export const resumeStateSchema = {
  // document
  lastSelection: { type: 'object' },
  lastSelectedNoteId: { type: 'string' },
  // notebook
  lastFolder: { type: 'string' },
  lastDocument: { type: 'string' }
} as const satisfies Record<keyof CollectionResumeStateRow, unknown>;
