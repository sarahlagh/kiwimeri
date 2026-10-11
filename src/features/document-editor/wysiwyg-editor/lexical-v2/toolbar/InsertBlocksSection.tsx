import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/extension';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLingui } from '@lingui/react/macro';
import useIsComposerEditable from '../hooks/useIsComposerEditable';
import { ToolbarButton } from './buttons';

export const InsertBlocksSection = () => {
  const [editor] = useLexicalComposerContext();
  const isEditable = useIsComposerEditable();
  const { t } = useLingui();
  return (
    <>
      <ToolbarButton
        ariaLabel={t`Insert Horizontal Bar`}
        icon="writer/hr.svg"
        disabled={!isEditable}
        onClick={() => {
          editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
        }}
      />
    </>
  );
};
