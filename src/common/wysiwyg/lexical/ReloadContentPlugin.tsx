import { unminimizeContentFromStorage } from '@/common/wysiwyg/compress-file-content';
import { INITIAL_CONTENT_START, initialContent } from '@/db/collection.service';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  createEmptyHistoryState,
  HistoryState
} from '@lexical/react/LexicalHistoryPlugin';
import { $setSelection } from 'lexical';
import { useEffect, useState } from 'react';
import { RELOAD_TAG, SELECTION_CHANGE_TAG } from './constants';
import {
  deserializeSelection,
  SerializedSelection
} from './selection-serializer';

export default function ReloadContentPlugin({
  id,
  content,
  serializedSelection,
  setHistory
}: {
  id: string;
  content: string;
  serializedSelection?: SerializedSelection | null;
  setHistory: React.Dispatch<React.SetStateAction<HistoryState>>;
}) {
  const [editor] = useLexicalComposerContext();
  const [historyMap] = useState<Map<string, HistoryState>>(new Map());

  useEffect(() => {
    if (content === '') content = initialContent();
    const newState = editor.parseEditorState(
      content.startsWith(INITIAL_CONTENT_START)
        ? content
        : unminimizeContentFromStorage(content)
    );
    queueMicrotask(() => {
      editor.setEditorState(newState, {
        tag: RELOAD_TAG
      });
    });

    queueMicrotask(() => {
      editor.update(
        () => {
          if (serializedSelection) {
            const selection = deserializeSelection(serializedSelection);
            if (selection) {
              $setSelection(selection);
            }
          }
        },
        { tag: [RELOAD_TAG, SELECTION_CHANGE_TAG] }
      );
    });

    if (historyMap.has(id) && historyMap.get(id)) {
      setHistory(historyMap.get(id)!);
    } else {
      historyMap.set(id, createEmptyHistoryState());
      setHistory(historyMap.get(id)!);
    }
  }, [id]); // re-run the hook on document change

  return null;
}
