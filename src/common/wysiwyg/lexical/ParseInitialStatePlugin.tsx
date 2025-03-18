import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { initialContent } from '../../../db/documents.service';
import { unminimizeFromStorage } from '../compress-storage';

interface ParseInitialStatePluginProps {
  content: string;
}

export default function ParseInitialStatePlugin({
  content
}: ParseInitialStatePluginProps) {
  const [editor] = useLexicalComposerContext();
  const serializedEditorState = content
    ? content.startsWith('{"root":{')
      ? content
      : unminimizeFromStorage(content)
    : initialContent();
  try {
    const state = editor.parseEditorState(serializedEditorState);
    useEffect(() => {
      editor.setEditorState(state);
    }, [content]);
  } catch (e) {
    console.error(
      '[kiwimeri] an unexpected error occurred parsing editor state',
      e
    );
  }
  return null;
}
