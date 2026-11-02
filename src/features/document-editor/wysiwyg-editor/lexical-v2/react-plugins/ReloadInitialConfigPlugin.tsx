import { initialContent } from '@/domain/collection/collection.service';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $setSelection, HISTORIC_TAG, SerializedEditorState } from 'lexical';
import { Key, RefObject, useEffect, useRef } from 'react';
import { RELOAD_TAG, SELECTION_CHANGE_TAG } from '../constants';
import {
  CustomInitialEditorStateType,
  RichTextEditorInitialData
} from '../types';
import { deserializeSelection } from '../utils/node-serializer';

type ReloadInitialConfigPluginProps = {
  isReloadingRef: RefObject<boolean>;
  reloadKey?: Key;
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

export default function ReloadInitialConfigPlugin(
  data: ReloadInitialConfigPluginProps
) {
  const [editor] = useLexicalComposerContext();
  const globalEditable =
    data.globalEditable !== undefined ? data.globalEditable : true;
  const initialReloadRef = useRef(data.reloadKey);

  // set editor state
  useEffect(() => {
    initialReloadRef.current = data.reloadKey;
    const parseableState = getParseableState(data.initialState);
    const newState = editor.parseEditorState(parseableState);
    let cancelled = false;

    queueMicrotask(() => {
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
            const selection = deserializeSelection(data.serializedSelection);
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

    return () => {
      cancelled = true;
    };
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
