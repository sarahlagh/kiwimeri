import type { LexicalEditor } from 'lexical';
import { ReadOnlyEditorInstanceContext } from './react/EditorInstanceContext';

export type RichTextEditorHandle = {
  getEditor: () => LexicalEditor | null;
  getContext: () => ReadOnlyEditorInstanceContext | null;
  focusEditor: () => void;
};
