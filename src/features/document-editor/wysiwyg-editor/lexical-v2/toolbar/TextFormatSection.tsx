import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLingui } from '@lingui/react/macro';
import { FORMAT_TEXT_COMMAND, TextFormatType } from 'lexical';
import { ToolbarButton } from './buttons';
import { useToolbarState } from './ToolbarContext';

function TextFormatToolbarButton({
  formatType,
  isActive
}: {
  formatType: TextFormatType;
  isActive: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  const { t } = useLingui();
  return (
    <ToolbarButton
      ariaLabel={t`Format ${formatType}`}
      icon={`writer/type-${formatType}.svg`}
      isActive={isActive}
      onClick={() => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, formatType);
      }}
    />
  );
}

export const TextFormatSection = () => {
  const { toolbarState } = useToolbarState();

  return (
    <>
      <TextFormatToolbarButton
        formatType="bold"
        isActive={toolbarState.isBold}
      />
      <TextFormatToolbarButton
        formatType="italic"
        isActive={toolbarState.isItalic}
      />
      <TextFormatToolbarButton
        formatType="strikethrough"
        isActive={toolbarState.isStrikethrough}
      />
      <TextFormatToolbarButton
        formatType="underline"
        isActive={toolbarState.isUnderline}
      />
      <TextFormatToolbarButton
        formatType="highlight"
        isActive={toolbarState.isHighlight}
      />
    </>
  );
};
