import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { useLingui } from '@lingui/react/macro';
import { Dispatch } from 'react';
import { ToolbarButton } from './buttons';

export type GlobalEditorSectionProps = {
  isEditableStateUpdatable?: boolean;
  setIsComposerEditable?: Dispatch<boolean>;
};

export const GlobalEditorSection = ({
  isEditableStateUpdatable = true,
  setIsComposerEditable
}: GlobalEditorSectionProps) => {
  const [editor] = useLexicalComposerContext();
  const { t } = useLingui();
  const isEditable = useLexicalEditable();
  return (
    <>
      {isEditableStateUpdatable && (
        <ToolbarButton
          ariaLabel={t`Read Mode`}
          icon="writer/book.svg"
          isActive={!isEditable}
          onClick={() => {
            const _isEditable = !isEditable;
            if (setIsComposerEditable) {
              setIsComposerEditable(_isEditable);
            }
            editor.setEditable(_isEditable);
          }}
        />
      )}
    </>
  );
};
