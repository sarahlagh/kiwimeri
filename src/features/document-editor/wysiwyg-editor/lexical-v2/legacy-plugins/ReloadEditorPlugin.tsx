import { initialContent } from '@/domain/collection/collection.service';
import { SerializedSelection } from '@/domain/collection/resume-state';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $setSelection, SerializedEditorState } from 'lexical';
import { useEffect } from 'react';
import { RELOAD_TAG, SELECTION_CHANGE_TAG } from '../constants';
import { deserializeSelection } from '../node-serializer';
import { CustomInitialEditorStateType } from '../types';

function getParseableState(
  content?: CustomInitialEditorStateType
): string | SerializedEditorState {
  if (!content) return initialContent();
  if (content === '') return initialContent();
  if (typeof content === 'string') return content;
  if ('root' in content) return content;
  return content.toJSON();
}

export default function ReloadEditorPlugin({
  globalEditable = true,
  initialState,
  serializedSelection
}: {
  globalEditable?: boolean;
  initialState?: CustomInitialEditorStateType;
  serializedSelection?: SerializedSelection | null;
}) {
  const [editor] = useLexicalComposerContext();
  const parseableState = getParseableState(initialState);

  // set editor state
  useEffect(() => {
    const newState = editor.parseEditorState(parseableState);
    let cancelled = false;

    queueMicrotask(() => {
      editor.setEditorState(newState, { tag: RELOAD_TAG });

      if (!deviceSettings.get('resumeLastSelection')) return;
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
    // listening to change on serializedSelection isn't needed
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [editor, parseableState]);

  // set updatable state
  useEffect(() => {
    editor.setEditable(globalEditable)
  }, [globalEditable, editor]);

  return null;
}
