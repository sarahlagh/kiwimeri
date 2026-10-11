import { useLingui } from '@lingui/react/macro';
import { useEditorContext } from '../RichTextEditor';
import { ToolbarButton } from './buttons';

export const GlobalEditorSection = () => {
  const { t } = useLingui();
  const {
    isEditableStateUpdatable,
    isComposerEditable,
    setIsComposerEditable
  } = useEditorContext();
  return (
    <>
      {isEditableStateUpdatable && (
        <ToolbarButton
          ariaLabel={t`Read Mode`}
          icon="writer/book.svg"
          isActive={!isComposerEditable}
          onClick={() => {
            setIsComposerEditable(!isComposerEditable);
          }}
        />
      )}
    </>
  );
};
