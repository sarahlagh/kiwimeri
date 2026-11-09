import { initialContent } from '@/domain/collection/collection.service';
import {
  createEmptyHistoryState,
  HistoryState,
  registerHistory
} from '@lexical/history';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $setSelection,
  HISTORIC_TAG,
  mergeRegister,
  SerializedEditorState
} from 'lexical';
import { RefObject, useEffect, useRef } from 'react';
import { RELOAD_TAG, SELECTION_CHANGE_TAG } from '../constants';
import {
  CustomInitialEditorStateType,
  RichTextEditorInitialData
} from '../types';
import { $deserializeSelection } from '../utils/node-serializer';
import { useGlobalReactContext } from './GlobalReactContext';

type ReloadPluginProps = {
  isReloadingRef: RefObject<boolean>;
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
  const [editor] = useLexicalComposerContext();
  const { updateContext } = useGlobalReactContext();
  const historyStoreRef = useRef(new Map<string, HistoryState>());
  const initialReloadRef = useRef(data.reloadKey);
  const globalEditable = data.editable !== undefined ? data.editable : true;

  // set editor state
  useEffect(() => {
    initialReloadRef.current = data.reloadKey;
    const parseableState = getParseableState(data.initialState);
    const newState = editor.parseEditorState(parseableState);
    let cancelled = false;

    queueMicrotask(() => {
      console.debug('[RELOAD] reloading', data.historyId);
      data.isReloadingRef.current = true;
      editor.setEditorState(newState, {
        tag: HISTORIC_TAG // ideally I'd send both HISTORIC_TAG and RELOAD_TAG, but not possible
      });
      data.isReloadingRef.current = false;

      if (!data.resumeLastSelection) return;
      requestAnimationFrame(() => {
        if (cancelled) return;

        editor.update(
          () => {
            const selection = $deserializeSelection(data.serializedSelection);
            if (!selection) return;
            $setSelection(selection);
          },
          {
            tag: [SELECTION_CHANGE_TAG, RELOAD_TAG, HISTORIC_TAG],
            discrete: true
          }
        );
      });
    });

    if (data.enableHistory === false) {
      return () => {
        cancelled = true;
      };
    }

    const historyId = data.historyId || '';
    if (!historyStoreRef.current.has(historyId)) {
      historyStoreRef.current.set(historyId, createEmptyHistoryState());
    }
    const historyState = historyStoreRef.current.get(historyId)!;
    return mergeRegister(
      registerHistory(
        editor,
        historyState,
        1000, // delay
        () => Date.now(),
        historyState => {
          console.debug(
            '[HISTORY] redo',
            historyState.redoStack.length,
            'undo',
            historyState.undoStack.length
          );
          updateContext({
            canRedo: historyState.redoStack.length > 0,
            canRedoLength: historyState.redoStack.length,
            canUndo: historyState.undoStack.length > 0,
            canUndoLength: historyState.undoStack.length
          });
        },
        100 // maxDepth
      ),
      () => () => {
        cancelled = true;
      }
    );
    // listening to change on serializedSelection isn't needed
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [editor, data.historyId, data.initialState]);

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
