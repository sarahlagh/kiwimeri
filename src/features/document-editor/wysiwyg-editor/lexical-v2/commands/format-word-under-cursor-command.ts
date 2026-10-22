import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  LexicalCommand,
  LexicalEditor,
  TextFormatType,
  TextNode,
  createCommand
} from 'lexical';
import { EditorContextType } from '../EditorContext';

type CommandPayload = {
  formatType: TextFormatType;
  wordUnderCursor: EditorContextType['selectionContext']['wordUnderCursor'];
};

export const FORMAT_WORD_UNDER_CURSOR_COMMAND: LexicalCommand<CommandPayload> =
  createCommand('FORMAT_WORD_UNDER_CURSOR_COMMAND');

function splitNodeBetween(node: TextNode, indexes: [number, number, string]) {
  const [start, end, word] = indexes;
  const split1 = node.setMode('token').splitText(start);
  let nextNode = split1.length > 1 ? split1[1] : split1[0];
  let allNewNodes = split1;
  if (nextNode.getTextContent() !== word) {
    const split2 = nextNode.setMode('token').splitText(end - start);
    allNewNodes = [...split1, ...split2];
    nextNode = allNewNodes[1];
  }
  allNewNodes.forEach(p => p.setMode('normal'));
  return nextNode;
}

function toggleFormatUnderCursor(
  editor: LexicalEditor,
  formatType: TextFormatType,
  wordUnderCursor: EditorContextType['selectionContext']['wordUnderCursor']
) {
  if (!wordUnderCursor) return;
  editor.update(() => {
    const selection = $getSelection();
    const isRange = $isRangeSelection(selection);
    if (!selection || !isRange) return [];
    const node = selection.anchor.getNode(); // anchor === focus here
    if (!$isTextNode(node)) return;
    if (node.getTextContent() !== wordUnderCursor[2]) {
      const newNode = splitNodeBetween(node, wordUnderCursor);
      newNode.toggleFormat(formatType);
      selection.format = newNode.getFormat();
    } else {
      node.toggleFormat(formatType);
      selection.format = node.getFormat();
    }
  });
}

export function registerFormatWordUnderCursorCommand(editor: LexicalEditor) {
  return editor.registerCommand(
    FORMAT_WORD_UNDER_CURSOR_COMMAND,
    payload => {
      toggleFormatUnderCursor(
        editor,
        payload.formatType,
        payload.wordUnderCursor
      );
      return false;
    },
    COMMAND_PRIORITY_EDITOR
  );
}
