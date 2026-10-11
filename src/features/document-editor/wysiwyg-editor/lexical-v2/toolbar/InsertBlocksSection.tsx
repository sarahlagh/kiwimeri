import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/extension';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLingui } from '@lingui/react/macro';
import { ToolbarButton } from './buttons';

export const InsertBlocksSection = () => {
  const [editor] = useLexicalComposerContext();
  const { t } = useLingui();
  return (
    <>
      <ToolbarButton
        ariaLabel={t`Insert Horizontal Bar`}
        icon="writer/hr.svg"
        onClick={() => {
          editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
        }}
      />
    </>
  );
};
