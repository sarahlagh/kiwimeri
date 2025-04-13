import { unminimizeFromStorage } from '@/common/wysiwyg/compress-storage';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

export default function KiwimeriReloadContentPlugin({
  id,
  content
}: {
  id: string;
  content: string;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const newState = editor.parseEditorState(
      content.startsWith('{"root":{') ? content : unminimizeFromStorage(content)
    );
    editor.setEditorState(newState);
  }, [id]);

  return null;
}
