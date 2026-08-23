import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ParagraphNode } from 'lexical';
import { useEffect } from 'react';
import { ensurePersistentId } from '../block-state';

export function EnforceStatePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(ParagraphNode, node => {
      ensurePersistentId(node);
    });
  }, [editor]);

  return null;
}
