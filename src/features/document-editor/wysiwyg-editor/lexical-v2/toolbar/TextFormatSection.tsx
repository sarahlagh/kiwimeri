import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLingui } from '@lingui/react/macro';
import { FORMAT_TEXT_COMMAND, TextFormatType } from 'lexical';
import { FORMAT_WORD_UNDER_CURSOR_COMMAND } from '../commands/format-word-under-cursor-command';
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
          editor.dispatchCommand(FORMAT_WORD_UNDER_CURSOR_COMMAND, {
            formatType,
            wordUnderCursor: selectionContext.wordUnderCursor
          });
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
