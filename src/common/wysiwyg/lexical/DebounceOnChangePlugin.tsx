import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { EditorState, LexicalEditor } from 'lexical';

export function DebounceOnChangePlugin({
  waitFor = 0,
  onChange,
  ignoreHistoryMergeTagChange = true,
  ignoreSelectionChange = false
}: {
  waitFor?: number;
  // OnChangePlugin args:
  ignoreInitialChange?: boolean;
  ignoreSelectionChange?: boolean;
  ignoreHistoryMergeTagChange?: boolean;
  onChange: (
    editorState: EditorState,
    editor: LexicalEditor,
    tags: Set<string>
  ) => void;
}) {
  let timerId: NodeJS.Timeout | null = null;
  return (
    <OnChangePlugin
      ignoreSelectionChange={ignoreSelectionChange}
      ignoreHistoryMergeTagChange={ignoreHistoryMergeTagChange}
      onChange={(editorState, editor, tags) => {
        if (tags.has('focus') || tags.has('reload')) {
          console.debug('skipping editor change', tags);
        } else {
          if (waitFor <= 0) {
            onChange(editorState, editor, tags);
          } else if (timerId === null) {
            timerId = setTimeout(() => {
              onChange(editorState, editor, tags);
            }, waitFor);
          } else {
            clearTimeout(timerId);
            timerId = setTimeout(() => {
              onChange(editorState, editor, tags);
            }, waitFor);
          }
        }
      }}
    />
  );
}
