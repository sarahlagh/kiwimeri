import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { useLingui } from '@lingui/react/macro';
import { useEditorContext } from '../EditorContext';
import { ToolbarButton } from './buttons';

export const GlobalEditorSection = () => {
  const { t } = useLingui();
  const [editor] = useLexicalComposerContext();
  const { globalEditable } = useEditorContext();
  const isComposerEditable = useLexicalEditable();
  return (
    <>
      {globalEditable && (
        <ToolbarButton
          ariaLabel={t`Read Mode`}
          icon="writer/book.svg"
          isActive={!isComposerEditable}
          onClick={() => {
            editor.setEditable(!isComposerEditable);
          }}
        />
      )}
    </>
  );
};
