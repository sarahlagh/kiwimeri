import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $setBlocksType } from '@lexical/selection';
import { useLingui } from '@lingui/react/macro';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode
} from 'lexical';
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
      <ToolbarButton
        disabled={!isEditable}
        ariaLabel={t`Remove format`}
        icon="writer/x-square.svg"
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.getNodes().forEach(node => {
                if ($isTextNode(node)) {
                  node.setFormat(0);
                  const block = node.getTopLevelElement();
                  block?.setFormat('');
                }
              });
            }
            $setBlocksType(selection, () => $createParagraphNode());
          });
        }}
      />
    </>
  );
};
