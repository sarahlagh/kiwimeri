import { SerializedSelection } from '@/domain/collection/resume-state';
import {
  InitialEditorStateType,
  LexicalEditor,
  SerializedEditorState
} from 'lexical';
import { Key } from 'react';

export type CustomInitialEditorStateType =
  | SerializedEditorState
  | Exclude<InitialEditorStateType, (editor: LexicalEditor) => void>;

export type RichTextEditorInitialData = {
  initialState?: CustomInitialEditorStateType;
  globalEditable?: boolean;
  serializedSelection?: SerializedSelection | null;
  resumeLastSelection?: boolean;
  historyId?: string;
  reloadKey?: Key;
  enableHistory?: boolean;
};
