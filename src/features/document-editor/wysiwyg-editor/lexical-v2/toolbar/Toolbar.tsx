import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $onUpdate,
  COMMAND_PRIORITY_CRITICAL,
  SELECTION_CHANGE_COMMAND
} from 'lexical';
import { useCallback, useEffect } from 'react';
import { Divider } from './buttons';
import {
  GlobalEditorSection,
  GlobalEditorSectionProps
} from './GlobalEditorSection';
import { InsertBlocksSection } from './InsertBlocksSection';
import { TextFormatSection } from './TextFormatSection';
import './Toolbar.scss';
import { useToolbarState } from './ToolbarContext';

type ToolbarProps = GlobalEditorSectionProps;

const Toolbar = (props: ToolbarProps) => {
  const [editor] = useLexicalComposerContext();
  const { updateToolbarState } = useToolbarState();

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    const isRange = $isRangeSelection(selection);
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
  }, [updateToolbarState]);

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

  return (
    <div className="toolbar">
      <GlobalEditorSection {...props} />
      <Divider />
      {/* <BlockFormatSection />
      <Divider /> */}
      <TextFormatSection />
      <Divider />
      <InsertBlocksSection />
    </div>
  );
};

export default Toolbar;
