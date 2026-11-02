import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useExtensionSignalValue } from '@lexical/react/useExtensionSignalValue';
import { useLingui } from '@lingui/react/macro';
import { REMOVE_FORMAT_COMMAND } from '../commands/remove-format-command';
import { useEditorContext } from '../EditorContext';
import { OPEN_LINK_MODAL_COMMAND } from '../extensions/LinkExtension';
import SelectionContextExtension from '../extensions/SelectionContextExtension';
import { ToolbarButton } from './buttons';

export const OtherSection = () => {
  const [editor] = useLexicalComposerContext();
  const { isEditable } = useEditorContext();
  const selection = useExtensionSignalValue(
    SelectionContextExtension,
    'selectionContext'
  );
  const linkContext = selection.links;
  const { t } = useLingui();
  return (
    <>
      <ToolbarButton
        disabled={
          !isEditable ||
          linkContext.hasMultipleLinks ||
          selection.isSelectionOverMultipleBlocks
        }
        isActive={linkContext.isLink || linkContext.isAutoLink}
        ariaLabel={t`Toggle link`}
        icon="writer/link-45deg.svg"
        onClick={() => {
          editor.dispatchCommand(OPEN_LINK_MODAL_COMMAND);
        }}
      />
      <ToolbarButton
        disabled={!isEditable}
        ariaLabel={t`Remove format`}
        icon="writer/x-square.svg"
        onClick={() => {
          editor.dispatchCommand(REMOVE_FORMAT_COMMAND);
        }}
      />
    </>
  );
};
