import type { LexicalEditor } from 'lexical';

export type KiwimeriEditorHandle = {
  focusEditor: () => void;
  getEditor: () => LexicalEditor | null;
};

export type ReloadableKiwimeriEditorHandle = {
  refreshContent: () => void;
} & KiwimeriEditorHandle;
