import type { LexicalEditor } from 'lexical';
import { ReadOnlyEditorContext } from './EditorContext';

export type RichTextEditorHandle = {
  getEditor: () => LexicalEditor | null;
  getEditorContext: () => ReadOnlyEditorContext | null;
};
