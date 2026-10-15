import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLingui } from '@lingui/react/macro';
import { useEditorContext } from '../EditorContext';
import { ToolbarButton } from './buttons';

export const GlobalEditorSection = () => {
  const { t } = useLingui();
  const [editor] = useLexicalComposerContext();
  const { globalEditable, isEditable } = useEditorContext();
  return (
    <>
      {globalEditable && (
        <ToolbarButton
          ariaLabel={t`Read Mode`}
          icon="writer/book.svg"
          isActive={!isEditable}
          onClick={() => {
            editor.setEditable(!isEditable);
          }}
        />
      )}
    </>
  );
};
