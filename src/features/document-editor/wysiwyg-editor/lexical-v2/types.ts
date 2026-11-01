import { SerializedSelection } from '@/domain/collection/resume-state';
import {
  InitialEditorStateType,
  LexicalEditor,
  SerializedEditorState
} from 'lexical';

export type CustomInitialEditorStateType =
  | SerializedEditorState
  | Exclude<InitialEditorStateType, (editor: LexicalEditor) => void>;

export type RichTextEditorInitialData = {
  initialState?: CustomInitialEditorStateType;
  globalEditable?: boolean;
  historyId?: string;
  serializedSelection?: SerializedSelection | null;
  resumeLastSelection?: boolean;
};
