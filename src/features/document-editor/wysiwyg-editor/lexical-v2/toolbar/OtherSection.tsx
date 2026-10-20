import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLingui } from '@lingui/react/macro';
import { useEditorContext } from '../EditorContext';
import { OPEN_LINK_MODAL_COMMAND } from '../extensions/LinkExtension';
import { ToolbarButton } from './buttons';

export const OtherSection = () => {
  const [editor] = useLexicalComposerContext();
  const { selectionContext: selection, isEditable } = useEditorContext();
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
    </>
  );
};
