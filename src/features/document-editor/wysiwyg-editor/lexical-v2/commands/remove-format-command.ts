import { $setBlocksType } from '@lexical/selection';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  LexicalCommand,
  LexicalEditor,
  createCommand
} from 'lexical';

export const REMOVE_FORMAT_COMMAND: LexicalCommand<void> = createCommand(
  'REMOVE_FORMAT_COMMAND'
);

export function registerRemoveFormatCommand(editor: LexicalEditor) {
  return editor.registerCommand(
    REMOVE_FORMAT_COMMAND,
    () => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.getNodes().forEach(node => {
            if ($isTextNode(node)) {
              node.setFormat(0);
              const block = node.getTopLevelElement();
              block?.setFormat('');
            }
          });
        }
        $setBlocksType(selection, () => $createParagraphNode());
      });
      return false;
    },
    COMMAND_PRIORITY_EDITOR
  );
}
