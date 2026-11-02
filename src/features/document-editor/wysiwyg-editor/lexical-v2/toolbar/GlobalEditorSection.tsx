import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useExtensionSignalValue } from '@lexical/react/useExtensionSignalValue';
import { useLingui } from '@lingui/react/macro';
import { REDO_COMMAND, UNDO_COMMAND } from 'lexical';
import { useEditorContext } from '../EditorContext';
import { HistoryExtension } from '../extensions/HistoryExtension2';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_IN_COMMAND,
  ZOOM_OUT_COMMAND,
  ZoomExtension
} from '../extensions/ZoomExtension';
import { ToolbarButton } from './buttons';

export const GlobalEditorSection = () => {
  const { t } = useLingui();
  const [editor] = useLexicalComposerContext();
  const { globalEditable, isEditable } = useEditorContext();
  const zoomLevel = useExtensionSignalValue(ZoomExtension, 'zoom');
  const { canUndo, canRedo } = useExtensionSignalValue(
    HistoryExtension,
    'canUndoRedo'
  );

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
        ariaLabel={t`Zoom In`}
        icon="writer/zoom-in.svg"
        disabled={zoomLevel >= MAX_ZOOM}
        onClick={() => {
          editor.dispatchCommand(ZOOM_IN_COMMAND, null);
        }}
      />
      <ToolbarButton
        ariaLabel={t`Zoom Out`}
        icon="writer/zoom-out.svg"
        disabled={zoomLevel <= MIN_ZOOM}
        onClick={() => {
          editor.dispatchCommand(ZOOM_OUT_COMMAND, null);
        }}
      />
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
