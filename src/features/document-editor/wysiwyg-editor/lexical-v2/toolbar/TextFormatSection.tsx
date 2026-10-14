import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { useLingui } from '@lingui/react/macro';
import { FORMAT_TEXT_COMMAND, TextFormatType } from 'lexical';
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
  const { t } = useLingui();
  return (
    <ToolbarButton
      ariaLabel={t`Format ${formatType}`}
      icon={`writer/type-${formatType}.svg`}
      disabled={isDisabled}
      isActive={isActive}
      onClick={() => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, formatType);
      }}
    />
  );
}

export const TextFormatSection = () => {
  const { selectionContext: selection } = useEditorContext();
  const isEditable = useLexicalEditable();

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
