import { appConfig } from '@/config';
import { initialContent } from '@/domain/collection/collection.service';
import {
  createEmptyHistoryState,
  HistoryState,
  registerHistory
} from '@lexical/history';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $setSelection, SerializedEditorState } from 'lexical';
import { RefObject, useCallback, useEffect, useRef } from 'react';
import { RELOAD_TAG, SELECTION_CHANGE_TAG } from '../constants';
import {
  CustomInitialEditorStateType,
  RichTextEditorInitialData
} from '../types';
import { $deserializeSelection } from '../utils/node-serializer';
import { useGlobalReactContext } from './GlobalReactContext';

type ReloadPluginProps = {
  historyStoreRef: RefObject<Map<string, HistoryState>>; // must live outside of the editor
} & RichTextEditorInitialData;

function getParseableState(
  content?: CustomInitialEditorStateType
): string | SerializedEditorState {
  if (!content) return initialContent();
  if (content === '') return initialContent();
  if (typeof content === 'string') return content;
  if ('root' in content) return content;
  return content.toJSON();
}

export default function ReloadPlugin(data: ReloadPluginProps) {
  const { enableHistory = true } = data;
  const [editor] = useLexicalComposerContext();
  const { updateContext } = useGlobalReactContext();
  const historyStoreRef = data.historyStoreRef;
  const initialReloadRef = useRef(data.reloadKey);
  const globalEditable = data.editable !== undefined ? data.editable : true;

  const onHistoryChange = useCallback(
    (historyState: HistoryState) => {
      updateContext({
        canRedo: historyState.redoStack.length > 0,
        canRedoLength: historyState.redoStack.length,
        canUndo: historyState.undoStack.length > 0,
        canUndoLength: historyState.undoStack.length
      });
    },
    [updateContext]
  );

  // set editor state
  useEffect(() => {
    initialReloadRef.current = data.reloadKey;
    const parseableState = getParseableState(data.initialState);
    const newState = editor.parseEditorState(parseableState);
    let cancelled = false;
    let unregisterHistory = () => {};

    const historyId = data.historyId || '';
    if (!historyStoreRef.current.has(historyId)) {
      historyStoreRef.current.set(historyId, createEmptyHistoryState());
    }
    const historyState = historyStoreRef.current.get(historyId)!;

    queueMicrotask(() => {
      if (cancelled) return;
      try {
        editor.setEditorState(newState, {
          tag: RELOAD_TAG
        });
        if (enableHistory) {
          historyState.current = {
            editor,
            editorState: editor.getEditorState()
          };
          unregisterHistory = registerHistory(
            editor,
            historyState,
            appConfig.LEXICAL_HISTORY_DELAY,
            () => Date.now(),
            onHistoryChange,
            appConfig.LEXICAL_HISTORY_MAX_DEPTH
          );
        }
      } catch (e) {
        console.error('unexpected error loading state', e);
        return;
      }

      if (!data.resumeLastSelection) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        try {
          editor.update(
            () => {
              const selection = $deserializeSelection(data.initialSelection);
              if (!selection) return;
              $setSelection(selection);
            },
            {
              tag: [SELECTION_CHANGE_TAG, RELOAD_TAG],
              discrete: true
            }
          );
        } catch (e) {
          console.error('unable to set selection', e);
        }
      });
    });

    return () => {
      cancelled = true;
      unregisterHistory();
    };
    // listening to change on serializedSelection isn't needed
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [editor, data.historyId, data.initialState]);

  // reload key
  useEffect(() => {
    if (initialReloadRef.current === data.reloadKey) return;
    const parseableState = getParseableState(data.initialState);
    const newState = editor.parseEditorState(parseableState);
    editor.setEditorState(newState, {
      tag: RELOAD_TAG
    });
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [editor, data.reloadKey]);

  // set updatable state
  useEffect(() => {
    editor.setEditable(globalEditable);
  }, [globalEditable, editor]);

  return null;
}
