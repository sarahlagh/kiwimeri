import { $isListNode, ListNode } from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
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
  LexicalNode,
  mergeRegister,
  SELECTION_CHANGE_COMMAND
} from 'lexical';
import { useCallback, useEffect } from 'react';
import { useEditorContext } from '../EditorContext';
import { BlockFormatSection } from './BlockFormatSection';
import { Divider } from './buttons';
import { GlobalEditorSection } from './GlobalEditorSection';
import { InsertBlocksSection } from './InsertBlocksSection';
import { TextAlignSection } from './TextAlignSection';
import { TextFormatSection } from './TextFormatSection';
import './Toolbar.scss';

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

const Toolbar = () => {
  const [editor] = useLexicalComposerContext();

  const { updateSelectionContext } = useEditorContext();

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    const isRange = $isRangeSelection(selection);

    // block type
    if (isRange) {
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
          updateSelectionContext('blockType', 'list');
          updateSelectionContext(
            'listType',
            parentList ? parentList.getListType() : element.getListType()
          );
        } else if (isHeading) {
          updateSelectionContext('blockType', 'heading');
          updateSelectionContext('headingTag', element.getTag());
        } else {
          updateSelectionContext('blockType', element.getType());
          updateSelectionContext('headingTag', undefined);
          updateSelectionContext('listType', undefined);
        }

        updateSelectionContext(
          'elementFormat',
          $isElementNode(element) ? element.getFormatType() || 'left' : 'left'
        );
      }
    }

    // text format
    updateSelectionContext('isBold', isRange && selection.hasFormat('bold'));
    updateSelectionContext(
      'isItalic',
      isRange && selection.hasFormat('italic')
    );
    updateSelectionContext(
      'isStrikethrough',
      isRange && selection.hasFormat('strikethrough')
    );
    updateSelectionContext(
      'isUnderline',
      isRange && selection.hasFormat('underline')
    );
    updateSelectionContext(
      'isHighlight',
      isRange && selection.hasFormat('highlight')
    );
  }, [editor, updateSelectionContext]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $onUpdate(() => editor.read('latest', $updateToolbar));
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );
  }, [editor, $updateToolbar]);

  return (
    <div className="toolbar" role="toolbar">
      <GlobalEditorSection />
      <Divider />
      <TextFormatSection />
      <Divider />
      <TextAlignSection />
      <Divider />
      <InsertBlocksSection />
      <Divider />
      <BlockFormatSection editor={editor} />
    </div>
  );
};

export default Toolbar;
