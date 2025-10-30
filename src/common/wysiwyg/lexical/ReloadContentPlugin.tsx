import { unminimizeContentFromStorage } from '@/common/wysiwyg/compress-file-content';
import { INITIAL_CONTENT_START, initialContent } from '@/db/collection.service';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

export default function ReloadContentPlugin({
  id,
  content
}: {
  id: string;
  content: string;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (content === '') content = initialContent();
    const newState = editor.parseEditorState(
      content.startsWith(INITIAL_CONTENT_START)
        ? content
        : unminimizeContentFromStorage(content)
    );
    queueMicrotask(() => {
      editor.setEditorState(newState, {
        tag: 'reload'
      });
    });
  }, [id]);

  return null;
}
