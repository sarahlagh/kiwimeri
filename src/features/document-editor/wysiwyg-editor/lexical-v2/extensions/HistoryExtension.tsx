import { batch, signal } from '@lexical/extension';
import { registerHistory } from '@lexical/history';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  createEmptyHistoryState,
  HistoryState
} from '@lexical/react/LexicalHistoryPlugin';
import { ReactExtension } from '@lexical/react/ReactExtension';
import { defineExtension } from 'lexical';
import { useEffect } from 'react';

const historyEnabledSignal = signal(true);
const historyStateSignal = signal<HistoryState | null>(null);
const canUndoRedoSignal = signal({ canUndo: false, canRedo: false });
const historyMap = new Map<string, HistoryState>();

type HistoryExtensionConfig = {
  historyId?: string;
  enabled: boolean;
};

const onHistoryStateChange = (historyState: HistoryState | null) =>
  batch(() => {
    const canUndo = historyState != null && historyState.undoStack.length > 0;
    const canRedo = historyState != null && historyState.redoStack.length > 0;
    canUndoRedoSignal.value = { canRedo, canUndo };
    historyStateSignal.value = historyState;
  });

function HistoryExtensionWrapper({
  historyId,
  enabled = true
}: HistoryExtensionConfig) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const key = historyId || '';
    historyEnabledSignal.value = enabled;
    if (!enabled) {
      onHistoryStateChange(null);
      return;
    }
    if (!historyMap.has(key)) {
      historyMap.set(key, createEmptyHistoryState());
    }
    const historyState = historyMap.get(key)!;
    return registerHistory(
      editor,
      historyState,
      1000, // delay
      () => Date.now(),
      onHistoryStateChange,
      100 // maxDepth
    );
  }, [editor, historyId, enabled]);
  return null;
}

export const HistoryExtension = defineExtension({
  name: '@kiwimeri/rich-text/history',
  namespace: 'react-rich',
  build() {
    return {
      historyEnabledSignal,
      historyStateSignal,
      canUndoRedoSignal,
      Component: HistoryExtensionWrapper
    };
  },
  register() {
    return () => {
      historyMap.clear();
      historyEnabledSignal.value = true;
      onHistoryStateChange(null);
    };
  },
  dependencies: [ReactExtension]
});
