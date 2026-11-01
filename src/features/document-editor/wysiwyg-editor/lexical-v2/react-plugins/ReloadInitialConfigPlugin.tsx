import { initialContent } from '@/domain/collection/collection.service';
import { registerHistory } from '@lexical/history';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $setSelection, HISTORIC_TAG, SerializedEditorState } from 'lexical';
import { RefObject, useEffect } from 'react';
import { RELOAD_TAG, SELECTION_CHANGE_TAG } from '../constants';
import { useEditorContext } from '../EditorContext';
import {
  CustomInitialEditorStateType,
  RichTextEditorInitialData
} from '../types';
import { deserializeSelection } from '../utils/node-serializer';

type ReloadInitialConfigPluginProps = {
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

export default function ReloadInitialConfigPlugin(
  data: ReloadInitialConfigPluginProps
) {
  const [editor] = useLexicalComposerContext();
  const parseableState = getParseableState(data.initialState);
  const globalEditable =
    data.globalEditable !== undefined ? data.globalEditable : true;
  const { historyState } = useEditorContext();

  // set editor state
  useEffect(() => {
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

    const cleanup = registerHistory(
      editor,
      historyState,
      100, // delay
      () => Date.now(),
      undefined, // onHistoryStateChange
      100 // maxDepth
    );

    return () => {
      cancelled = true;
      cleanup();
    };
    // listening to change on serializedSelection isn't needed
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [editor, data.historyId, parseableState]);

  // set updatable state
  useEffect(() => {
    editor.setEditable(globalEditable);
  }, [globalEditable, editor]);

  return null;
}
