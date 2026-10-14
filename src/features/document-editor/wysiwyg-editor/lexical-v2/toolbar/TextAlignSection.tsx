import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { useLingui } from '@lingui/react/macro';
import { FORMAT_ELEMENT_COMMAND } from 'lexical';
import { ToolbarButton } from './buttons';
import { useToolbarState } from './ToolbarContext';

export const TextAlignSection = () => {
  const [editor] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const { toolbarState } = useToolbarState();
  const { t } = useLingui();
  return (
    <>
      <ToolbarButton
        ariaLabel={t`Align left`}
        icon="writer/text-left.svg"
        disabled={!isEditable}
        isActive={toolbarState.elementFormat === 'left'}
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
        }}
      />
      <ToolbarButton
        ariaLabel={t`Align center`}
        icon="writer/text-center.svg"
        disabled={!isEditable}
        isActive={toolbarState.elementFormat === 'center'}
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
        }}
      />
      <ToolbarButton
        ariaLabel={t`Align right`}
        icon="writer/text-right.svg"
        disabled={!isEditable}
        isActive={toolbarState.elementFormat === 'right'}
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
        }}
      />
      <ToolbarButton
        ariaLabel={t`Align justify`}
        icon="writer/text-justify.svg"
        disabled={!isEditable}
        isActive={toolbarState.elementFormat === 'justify'}
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
        }}
      />
    </>
  );
};
