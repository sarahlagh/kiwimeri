import { initialContent } from '@/db/collection.service';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  createEmptyHistoryState,
  HistoryState
} from '@lexical/react/LexicalHistoryPlugin';
import { useEffect, useState } from 'react';

export default function ReloadContentPlugin({
  id,
  content,
  setHistory
}: {
  id: string;
  content: string;
  setHistory: React.Dispatch<React.SetStateAction<HistoryState>>;
}) {
  const [editor] = useLexicalComposerContext();
  const [historyMap] = useState<Map<string, HistoryState>>(new Map());

  useEffect(() => {
    if (content === '') content = initialContent();
    const newState = editor.parseEditorState(content);
    queueMicrotask(() => {
      editor.setEditorState(newState, {
        tag: 'reload'
      });
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
