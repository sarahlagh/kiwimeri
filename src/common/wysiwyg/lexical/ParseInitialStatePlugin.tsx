import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { initialContent } from '../../../db/documents.service';
import { unminimizeFromStorage } from '../conversion';

interface ParseInitialStatePluginProps {
  content: string;
}

export default function ParseInitialStatePlugin({
  content
}: ParseInitialStatePluginProps) {
  const [editor] = useLexicalComposerContext();
  const serializedEditorState = content
    ? unminimizeFromStorage(content)
    : initialContent();
  const state = editor.parseEditorState(serializedEditorState);
  useEffect(() => {
    editor.setEditorState(state);
  }, [content]);

  return null;
}
