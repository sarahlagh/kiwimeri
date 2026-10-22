import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLingui } from '@lingui/react/macro';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  FORMAT_TEXT_COMMAND,
  LexicalEditor,
  TextFormatType,
  TextNode
} from 'lexical';
import { EditorContextType, useEditorContext } from '../EditorContext';
import { ToolbarButton } from './buttons';

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

function TextFormatToolbarButton({
  formatType,
  isDisabled,
  isActive
}: {
  formatType: TextFormatType;
  isDisabled: boolean;
  isActive: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  const { selectionContext } = useEditorContext();
  const { t } = useLingui();
  return (
    <ToolbarButton
      ariaLabel={t`Format ${formatType}`}
      icon={`writer/type-${formatType}.svg`}
      disabled={isDisabled}
      isActive={isActive}
      onClick={() => {
        if (selectionContext.isTextOrElementSelection) {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, formatType);
        } else if (selectionContext.wordUnderCursor) {
          toggleFormatUnderCursor(
            editor,
            formatType,
            selectionContext.wordUnderCursor
          );
        }
      }}
    />
  );
}

export const TextFormatSection = () => {
  const { selectionContext: selection, isEditable } = useEditorContext();
  return (
    <>
      <TextFormatToolbarButton
        formatType="bold"
        isDisabled={!isEditable}
        isActive={selection.isBold}
      />
      <TextFormatToolbarButton
        formatType="italic"
        isDisabled={!isEditable}
        isActive={selection.isItalic}
      />
      <TextFormatToolbarButton
        formatType="strikethrough"
        isDisabled={!isEditable}
        isActive={selection.isStrikethrough}
      />
      <TextFormatToolbarButton
        formatType="underline"
        isDisabled={!isEditable}
        isActive={selection.isUnderline}
      />
      <TextFormatToolbarButton
        formatType="highlight"
        isDisabled={!isEditable}
        isActive={selection.isHighlight}
      />
    </>
  );
};
