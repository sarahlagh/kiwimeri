import type { LexicalEditor } from 'lexical';

export type RichTextEditorHandle = {
  getEditor: () => LexicalEditor | null;
};
