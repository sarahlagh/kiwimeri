import { $isAutoLinkNode, $isLinkNode } from '@lexical/link';
import { $isListNode, ListNode } from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ReactExtension } from '@lexical/react/ReactExtension';
import { $isHeadingNode } from '@lexical/rich-text';
import { $getNearestNodeOfType } from '@lexical/utils';
import {
  $findMatchingParent,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $onUpdate,
  COMMAND_PRIORITY_CRITICAL,
  configExtension,
  defineExtension,
  LexicalNode,
  mergeRegister,
  SELECTION_CHANGE_COMMAND
} from 'lexical';
import { useCallback, useEffect } from 'react';
import { newInitialSelectionContext, useEditorContext } from '../EditorContext';
import { getSelectedNode } from '../utils/getSelectedNode';

function $findTopLevelElement(node: LexicalNode) {
  let topLevelElement =
    node.getKey() === 'root'
      ? node
      : $findMatchingParent(node, e => {
          const parent = e.getParent();
          return parent !== null && $isRootOrShadowRoot(parent);
        });

  if (topLevelElement === null) {
    topLevelElement = node.getTopLevelElementOrThrow();
  }
  return topLevelElement;
}

function SetSelectionContextWrapper() {
  const [editor] = useLexicalComposerContext();
  const { setSelectionContext } = useEditorContext();

  const $updateSelectionContext = useCallback(() => {
    const selection = $getSelection();
    const isRange = $isRangeSelection(selection);
    const newSelectionContext = newInitialSelectionContext();

    // block type
    if (isRange) {
      const startEndPoints = selection.getStartEndPoints();
      const isTextOrElementSelection =
        startEndPoints && !startEndPoints[0].is(startEndPoints[1]);
      if (isTextOrElementSelection) {
        const startParents = startEndPoints[0].getNode().getParents();
        const endParents = startEndPoints[1].getNode().getParents();
        // remove the root element
        startParents.pop();
        endParents.pop();
        newSelectionContext.isSelectionOverMultipleBlocks = !startParents[
          startParents.length - 1
        ].is(endParents[endParents.length - 1]);
      }

      newSelectionContext.isTextOrElementSelection = isTextOrElementSelection;

      const anchorNode = selection.anchor.getNode();
      const element = $findTopLevelElement(anchorNode);
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);
      if (elementDOM !== null) {
        const isHeading = $isHeadingNode(element);
        const isList = $isListNode(element);
        if (isList) {
          const parentList = $getNearestNodeOfType<ListNode>(
            anchorNode,
            ListNode
          );
          newSelectionContext.blockType = 'list';
          newSelectionContext.listType = parentList
            ? parentList.getListType()
            : element.getListType();
        } else if (isHeading) {
          newSelectionContext.blockType = 'heading';
          newSelectionContext.headingTag = element.getTag();
        } else {
          newSelectionContext.blockType = element.getType();
        }
        newSelectionContext.elementFormat = $isElementNode(element)
          ? element.getFormatType() || 'left'
          : 'left';
      }

      // links
      const linkNodes = new Set(
        selection
          .getNodes()
          .map(n => n.getParent())
          .filter(parent => {
            return $isLinkNode(parent) || $isAutoLinkNode(parent);
          })
      );
      newSelectionContext.links.hasMultipleLinks = linkNodes.size > 1;

      const parent =
        linkNodes.size === 1
          ? [...linkNodes][0]
          : getSelectedNode(selection).getParent();
      const isLink = $isLinkNode(parent);
      const isAutoLink = $isAutoLinkNode(parent);
      newSelectionContext.links.isLink = isLink;
      newSelectionContext.links.isAutoLink = isAutoLink;
      if (isAutoLink) {
        newSelectionContext.links.isAutoLinkUnlinked = parent.getIsUnlinked();
      }
      if (isLink) {
        newSelectionContext.links.linkUrl = parent.getURL();
      }
      if (isTextOrElementSelection) {
        newSelectionContext.links.linkText = selection.getTextContent();
      } else if (isLink) {
        newSelectionContext.links.linkText = parent.getTextContent();
      } // TODO else grab word under cursor

      // text format
      newSelectionContext.isBold = selection.hasFormat('bold');
      newSelectionContext.isItalic = selection.hasFormat('italic');
      newSelectionContext.isStrikethrough =
        selection.hasFormat('strikethrough');
      newSelectionContext.isUnderline = selection.hasFormat('underline');
      newSelectionContext.isHighlight = selection.hasFormat('highlight');
    }

    setSelectionContext(newSelectionContext);
  }, [editor, setSelectionContext]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateSelectionContext();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $onUpdate(() => editor.read('latest', $updateSelectionContext));
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );
  }, [editor, $updateSelectionContext]);
  return null;
}

const SetSelectionContextExtension = defineExtension({
  name: '@kiwimeri/rich-text/set-selection-context',
  namespace: 'react-rich',
  dependencies: [
    configExtension(ReactExtension, {
      decorators: [<SetSelectionContextWrapper key="" />]
    })
  ]
});

export default SetSelectionContextExtension;
