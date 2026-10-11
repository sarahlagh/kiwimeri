import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isHeadingNode } from '@lexical/rich-text';
import {
  $findMatchingParent,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $onUpdate,
  COMMAND_PRIORITY_CRITICAL,
  LexicalNode,
  SELECTION_CHANGE_COMMAND
} from 'lexical';
import { useCallback, useEffect } from 'react';
import { BlockFormatSection } from './BlockFormatSection';
import { Divider } from './buttons';
import { GlobalEditorSection } from './GlobalEditorSection';
import { InsertBlocksSection } from './InsertBlocksSection';
import { TextFormatSection } from './TextFormatSection';
import './Toolbar.scss';
import { useToolbarState } from './ToolbarContext';

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
  const { updateToolbarState } = useToolbarState();

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    const isRange = $isRangeSelection(selection);
    console.debug('UPDATE TOOLBAR', selection, isRange);

    // block type
    if (isRange) {
      const anchorNode = selection.anchor.getNode();
      const element = $findTopLevelElement(anchorNode);
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);
      if (elementDOM !== null) {
        const isHeading = $isHeadingNode(element);
        if (isHeading) {
          updateToolbarState('blockType', 'heading');
          updateToolbarState('headingTag', element.getTag());
        } else {
          updateToolbarState('blockType', 'paragraph');
          updateToolbarState('headingTag', undefined);
        }
      }
    }

    // text format
    updateToolbarState('isBold', isRange && selection.hasFormat('bold'));
    updateToolbarState('isItalic', isRange && selection.hasFormat('italic'));
    updateToolbarState(
      'isStrikethrough',
      isRange && selection.hasFormat('strikethrough')
    );
    updateToolbarState(
      'isUnderline',
      isRange && selection.hasFormat('underline')
    );
    updateToolbarState(
      'isHighlight',
      isRange && selection.hasFormat('highlight')
    );
  }, [editor, updateToolbarState]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        $onUpdate(() => newEditor.read('latest', $updateToolbar));
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, $updateToolbar]);
  // useEffect(() => {
  //   editor.read('latest', () => {
  //     $updateToolbar();
  //   });
  // }, [editor, $updateToolbar]);

  return (
    <div className="toolbar">
      <GlobalEditorSection />
      <Divider />
      <BlockFormatSection />
      <Divider />
      <TextFormatSection />
      <Divider />
      <InsertBlocksSection />
    </div>
  );
};

export default Toolbar;
