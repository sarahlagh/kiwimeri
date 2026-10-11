import {
  InitialEditorStateType,
  LexicalEditor,
  SerializedEditorState
} from 'lexical';

export type CustomInitialEditorStateType =
  | SerializedEditorState
  | Exclude<InitialEditorStateType, (editor: LexicalEditor) => void>;
