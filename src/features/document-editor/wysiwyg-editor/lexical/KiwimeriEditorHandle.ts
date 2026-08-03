export type KiwimeriEditorHandle = {
  focusEditor: () => void;
};

export type ReloadableKiwimeriEditorHandle = {
  refreshContent: () => void;
} & KiwimeriEditorHandle;
