import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createHeadingNode, HeadingTagType } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import {
  $createParagraphNode,
  $getSelection,
  $setSelection,
  ElementNode
} from 'lexical';
import useIsComposerEditable from '../hooks/useIsComposerEditable';
import { ToolbarButton } from './buttons';
import { useToolbarState } from './ToolbarContext';

function SetBlockTypeToolbarButton({
  createBlock,
  isDisabled,
  isActive,
  icon,
  ariaLabel
}: {
  createBlock: () => ElementNode;
  isDisabled: boolean;
  isActive: boolean;
  icon: string;
  ariaLabel: string;
}) {
  const [editor] = useLexicalComposerContext();
  return (
    <ToolbarButton
      ariaLabel={ariaLabel}
      disabled={isDisabled}
      icon={icon}
      isActive={isActive}
      onClick={() => {
        editor.update(() => {
          const selection = $getSelection();
          const newBlock = !isActive ? createBlock() : $createParagraphNode();
          $setBlocksType(selection, () => newBlock);
          $setSelection(newBlock.select());
        });
      }}
    />
  );
}

function HeadingToolbarButton({
  level,
  isDisabled,
  isActive
}: {
  level: number;
  isDisabled: boolean;
  isActive: boolean;
}) {
  const tag = `h${level}` as HeadingTagType;
  return (
    <SetBlockTypeToolbarButton
      ariaLabel={`Header ${level}`}
      icon={`writer/type-${tag}.svg`}
      isDisabled={isDisabled}
      isActive={isActive}
      createBlock={() => $createHeadingNode(tag)}
    />
  );
}

export const BlockFormatSection = () => {
  const { toolbarState } = useToolbarState();
  const isEditable = useIsComposerEditable();

  return (
    <>
      <HeadingToolbarButton
        level={1}
        isDisabled={!isEditable}
        isActive={
          toolbarState.blockType === 'heading' &&
          toolbarState.headingTag === 'h1'
        }
      />
      <HeadingToolbarButton
        level={2}
        isDisabled={!isEditable}
        isActive={
          toolbarState.blockType === 'heading' &&
          toolbarState.headingTag === 'h2'
        }
      />
      <HeadingToolbarButton
        level={3}
        isDisabled={!isEditable}
        isActive={
          toolbarState.blockType === 'heading' &&
          toolbarState.headingTag === 'h3'
        }
      />
    </>
  );
};
