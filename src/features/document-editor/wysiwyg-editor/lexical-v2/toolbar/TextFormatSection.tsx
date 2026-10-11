import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLingui } from '@lingui/react/macro';
import { FORMAT_TEXT_COMMAND, TextFormatType } from 'lexical';
import useIsComposerEditable from '../hooks/useIsComposerEditable';
import { ToolbarButton } from './buttons';
import { useToolbarState } from './ToolbarContext';

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
  const { toolbarState } = useToolbarState();
  const isEditable = useIsComposerEditable();

  return (
    <>
      <TextFormatToolbarButton
        formatType="bold"
        isDisabled={!isEditable}
        isActive={toolbarState.isBold}
      />
      <TextFormatToolbarButton
        formatType="italic"
        isDisabled={!isEditable}
        isActive={toolbarState.isItalic}
      />
      <TextFormatToolbarButton
        formatType="strikethrough"
        isDisabled={!isEditable}
        isActive={toolbarState.isStrikethrough}
      />
      <TextFormatToolbarButton
        formatType="underline"
        isDisabled={!isEditable}
        isActive={toolbarState.isUnderline}
      />
      <TextFormatToolbarButton
        formatType="highlight"
        isDisabled={!isEditable}
        isActive={toolbarState.isHighlight}
      />
    </>
  );
};
