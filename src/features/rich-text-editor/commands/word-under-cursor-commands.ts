import { LinkAttributes, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  LexicalCommand,
  LexicalEditor,
  RangeSelection,
  TextFormatType,
  TextNode,
  createCommand
} from 'lexical';
import { SelectionContext } from '../extensions/SelectionContextExtension';

type WordUnderCursor = Required<SelectionContext>['wordUnderCursor'];

function splitNodeBetween(node: TextNode, indexes: WordUnderCursor) {
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

function doSomethingUnderCursor(
  editor: LexicalEditor,
  wordUnderCursor: WordUnderCursor | null,
  callback: (
    node: TextNode,
    selection: RangeSelection,
    isNewNode: boolean
  ) => void
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
      callback(newNode, selection, true);
    } else {
      callback(node, selection, false);
    }
  });
}

//////// format command

type FormatCommandPayload = {
  formatType: TextFormatType;
  wordUnderCursor: WordUnderCursor;
};

export const FORMAT_WORD_UNDER_CURSOR_COMMAND: LexicalCommand<FormatCommandPayload> =
  createCommand('FORMAT_WORD_UNDER_CURSOR_COMMAND');

export function registerFormatWordUnderCursorCommand(editor: LexicalEditor) {
  return editor.registerCommand(
    FORMAT_WORD_UNDER_CURSOR_COMMAND,
    payload => {
      doSomethingUnderCursor(
        editor,
        payload.wordUnderCursor,
        (node, selection) => {
          node.toggleFormat(payload.formatType);
          selection.format = node.getFormat();
        }
      );
      return false;
    },
    COMMAND_PRIORITY_EDITOR
  );
}

//////// link command

type CommandPayload = {
  wordUnderCursor: WordUnderCursor;
  url: string;
} & LinkAttributes;

export const CREATE_LINK_AT_WORD_UNDER_CURSOR_COMMAND: LexicalCommand<CommandPayload | null> =
  createCommand('CREATE_LINK_AT_WORD_UNDER_CURSOR_COMMAND');

export function registerLinkAtWordUnderCursorCommand(editor: LexicalEditor) {
  return editor.registerCommand(
    CREATE_LINK_AT_WORD_UNDER_CURSOR_COMMAND,
    payload => {
      doSomethingUnderCursor(
        editor,
        payload?.wordUnderCursor || null,
        (node, selection, isNewNode) => {
          if (isNewNode) {
            node.select();
          }
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, payload);
        }
      );
      return false;
    },
    COMMAND_PRIORITY_EDITOR
  );
}
