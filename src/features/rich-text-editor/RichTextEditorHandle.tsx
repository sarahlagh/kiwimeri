import type { LexicalEditor } from 'lexical';
import { ReadOnlyGlobalReactContext } from './react/GlobalReactContext';

export type RichTextEditorHandle = {
  getEditor: () => LexicalEditor | null;
  getContext: () => ReadOnlyGlobalReactContext | null;
  focusEditor: () => void;
};
