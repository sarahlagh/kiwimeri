import { initialContent } from '@/domain/collection/collection.service';
import { signal } from '@lexical/extension';
import { useExtensionSignalValue } from '@lexical/react/useExtensionSignalValue';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import {
  defineExtension,
  HISTORIC_TAG,
  safeCast,
  SerializedEditorState
} from 'lexical';
import {
  CustomInitialEditorStateType,
  RichTextEditorInitialData
} from '../types';

const initialConfig: RichTextEditorInitialData = { globalEditable: true };

function getParseableState(
  content?: CustomInitialEditorStateType
): string | SerializedEditorState {
  if (!content) return initialContent();
  if (content === '') return initialContent();
  if (typeof content === 'string') return content;
  if ('root' in content) return content;
  return content.toJSON();
}

export const ReloadConfigExtension = defineExtension({
  name: '@kiwimeri/rich-text/reload',
  config: safeCast<RichTextEditorInitialData>(initialConfig),
  build(editor, config) {
    const globalEditable = { ...initialConfig, ...config }
      .globalEditable as boolean;
    editor.setEditable(globalEditable);
    return { globalEditable: signal<boolean>(globalEditable) };
  },
  afterRegistration(editor, config) {
    console.debug('[RELOAD] apply new editor state');
    const parseableState = getParseableState(config.initialState);
    const newState = editor.parseEditorState(parseableState);
    editor.setEditorState(newState, {
      tag: HISTORIC_TAG
    });
    // TODO resumeLastSelection
    return () => {};
  }
});

export const useIsEditable = () => {
  const globalEditable = useExtensionSignalValue(
    ReloadConfigExtension,
    'globalEditable'
  );
  const isEditable = useLexicalEditable();
  return { globalEditable, isEditable };
};
