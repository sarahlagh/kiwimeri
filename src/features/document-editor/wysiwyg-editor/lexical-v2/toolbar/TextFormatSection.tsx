import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLingui } from '@lingui/react/macro';
import { $getSelection, $isRangeSelection, $isTextNode, FORMAT_TEXT_COMMAND, TextFormatType } from 'lexical';
import { useEditorContext } from '../EditorContext';
import { ToolbarButton } from './buttons';

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
  const {selectionContext: selection } = useEditorContext();
  const { t } = useLingui();
  return (
    <ToolbarButton
      ariaLabel={t`Format ${formatType}`}
      icon={`writer/type-${formatType}.svg`}
      disabled={isDisabled}
      isActive={isActive}
      onClick={() => {
        if (selection.isTextOrElementSelection) {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, formatType);
        } else {
          editor.update(() => {
            const selection = $getSelection();
            const isRange = $isRangeSelection(selection);
            if (selection && isRange) {
              const pointAtCaret = selection.getStartEndPoints()[0]; // start and end are the same here
              const nodeAtCaret = pointAtCaret.getNode();
              if ($isTextNode(nodeAtCaret)) {
                nodeAtCaret.toggleFormat(formatType);
              }
            }
          })
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
