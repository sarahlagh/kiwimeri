import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLingui } from '@lingui/react/macro';
import { FORMAT_TEXT_COMMAND, LexicalEditor, TextFormatType } from 'lexical';
import { FORMAT_WORD_UNDER_CURSOR_COMMAND } from '../commands/word-under-cursor-commands';
import { SelectionContext } from '../extensions/SelectionContextExtension';
import { useIsEditable, useSelectionContext } from '../hooks';
import { ToolbarButton } from './buttons';

function TextFormatToolbarButton({
  formatType,
  isDisabled,
  isActive,
  editor,
  selectionContext
}: {
  formatType: TextFormatType;
  isDisabled: boolean;
  isActive: boolean;
  editor: LexicalEditor;
  selectionContext: SelectionContext;
}) {
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
  const [editor] = useLexicalComposerContext();
  const selection = useSelectionContext();
  const { isEditable } = useIsEditable();
  return (
    <>
      <TextFormatToolbarButton
        formatType="bold"
        isDisabled={!isEditable}
        isActive={selection.isBold}
        editor={editor}
        selectionContext={selection}
      />
      <TextFormatToolbarButton
        formatType="italic"
        isDisabled={!isEditable}
        isActive={selection.isItalic}
        editor={editor}
        selectionContext={selection}
      />
      <TextFormatToolbarButton
        formatType="strikethrough"
        isDisabled={!isEditable}
        isActive={selection.isStrikethrough}
        editor={editor}
        selectionContext={selection}
      />
      <TextFormatToolbarButton
        formatType="underline"
        isDisabled={!isEditable}
        isActive={selection.isUnderline}
        editor={editor}
        selectionContext={selection}
      />
      <TextFormatToolbarButton
        formatType="highlight"
        isDisabled={!isEditable}
        isActive={selection.isHighlight}
        editor={editor}
        selectionContext={selection}
      />
    </>
  );
};
