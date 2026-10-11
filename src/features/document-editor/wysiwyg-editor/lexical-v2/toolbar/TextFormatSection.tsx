import { EditorStateExtension } from '@lexical/extension';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useExtensionDependency } from '@lexical/react/useExtensionComponent';
import { useSignalValue } from '@lexical/react/useExtensionSignalValue';
import { useLingui } from '@lingui/react/macro';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  TextFormatType
} from 'lexical';
import { ToolbarButton } from './buttons';

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
  const [editor] = useLexicalComposerContext();
  const editorState = useSignalValue(
    useExtensionDependency(EditorStateExtension).output
  );
  const states = editorState.read(
    () => {
      const selection = $getSelection();
      const isRange = $isRangeSelection(selection);
      return {
        isBold: isRange && selection.hasFormat('bold'),
        isItalic: isRange && selection.hasFormat('italic'),
        isStrikethrough: isRange && selection.hasFormat('strikethrough'),
        isUnderline: isRange && selection.hasFormat('underline'),
        isHighlight: isRange && selection.hasFormat('highlight')
      };
    },
    { editor }
  );
  return (
    <>
      <TextFormatToolbarButton formatType="bold" isActive={states.isBold} />
      <TextFormatToolbarButton formatType="italic" isActive={states.isItalic} />
      <TextFormatToolbarButton
        formatType="strikethrough"
        isActive={states.isStrikethrough}
      />
      <TextFormatToolbarButton
        formatType="underline"
        isActive={states.isUnderline}
      />
      <TextFormatToolbarButton
        formatType="highlight"
        isActive={states.isHighlight}
      />
    </>
  );
};
