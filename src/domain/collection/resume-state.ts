import { Id } from 'tinybase/with-schemas';

export type SerializedSelectedNode = {
  index: number;
  offset: number;
  type: string;
};
export type SerializedSelection = {
  anchor?: SerializedSelectedNode;
  focus: SerializedSelectedNode;
  format: number;
};

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
