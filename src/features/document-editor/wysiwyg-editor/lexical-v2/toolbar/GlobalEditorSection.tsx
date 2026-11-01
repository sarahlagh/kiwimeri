import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLingui } from '@lingui/react/macro';
import { REDO_COMMAND, UNDO_COMMAND } from 'lexical';
import { useEditorContext } from '../EditorContext';
import { ToolbarButton } from './buttons';

export const GlobalEditorSection = () => {
  const { t } = useLingui();
  const [editor] = useLexicalComposerContext();
  const { globalEditable, isEditable, historyState } = useEditorContext();
  const canUndo = historyState.undoStack.length > 0;
  const canRedo = historyState.redoStack.length > 0;

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
      <ToolbarButton
        ariaLabel={t`Undo`}
        icon="writer/arrow-counterclockwise.svg"
        disabled={!isEditable || !canUndo}
        onClick={() => {
          editor.dispatchCommand(UNDO_COMMAND);
        }}
      />
      <ToolbarButton
        ariaLabel={t`Redo`}
        icon="writer/arrow-clockwise.svg"
        disabled={!isEditable || !canRedo}
        onClick={() => {
          editor.dispatchCommand(REDO_COMMAND);
        }}
      />
    </>
  );
};
