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

function getSafeContent(content: string) {
  if (content === '') content = initialContent();
  return content.startsWith(INITIAL_CONTENT_START)
    ? content
    : unminimizeContentFromStorage(content);
}

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

  // history per document
  useEffect(() => {
    if (historyMap.has(id)) {
      setHistory(historyMap.get(id)!);
    } else {
      const history = createEmptyHistoryState();
      historyMap.set(id, history);
      setHistory(history);
    }
  }, [id, historyMap, setHistory]);

  // set editor state
  useEffect(() => {
    const newState = editor.parseEditorState(getSafeContent(content));
    let cancelled = false;

    queueMicrotask(() => {
      editor.setEditorState(newState, { tag: RELOAD_TAG });

      requestAnimationFrame(() => {
        if (cancelled) return;

        editor.update(
          () => {
            const selection = deserializeSelection(serializedSelection);
            if (!selection) return;
            $setSelection(selection);
          },
          { tag: [SELECTION_CHANGE_TAG, RELOAD_TAG], discrete: true }
        );
      });
    });

    return () => {
      cancelled = true;
    };
  }, [editor, id]); // re-run the hook on document change

  return null;
}
