import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/extension';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLingui } from '@lingui/react/macro';
import { useEditorContext } from '../EditorContext';
import { ToolbarButton } from './buttons';

export const InsertBlocksSection = () => {
  const [editor] = useLexicalComposerContext();
  const { isEditable } = useEditorContext();
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
