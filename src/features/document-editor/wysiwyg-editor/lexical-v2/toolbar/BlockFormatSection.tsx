import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createHeadingNode, HeadingTagType } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $createParagraphNode, $getSelection, ElementNode } from 'lexical';
import { ToolbarButton } from './buttons';

function SetBlockTypeToolbarButton({
  createBlock,
  isActive,
  icon,
  ariaLabel
}: {
  createBlock: () => ElementNode;
  isActive: boolean;
  icon: string;
  ariaLabel: string;
}) {
  const [editor] = useLexicalComposerContext();
  return (
    <ToolbarButton
      ariaLabel={ariaLabel}
      icon={icon}
      isActive={isActive}
      onClick={() => {
        editor.update(() => {
          const selection = $getSelection();
          $setBlocksType(selection, () =>
            !isActive ? createBlock() : $createParagraphNode()
          );
        });
      }}
    />
  );
}

function HeadingToolbarButton({
  level,
  isActive
}: {
  level: number;
  isActive: boolean;
}) {
  const tag = `h${level}` as HeadingTagType;
  return (
    <SetBlockTypeToolbarButton
      ariaLabel={`Header ${level}`}
      icon={`writer/type-${tag}.svg`}
      isActive={isActive}
      createBlock={() => $createHeadingNode(tag)}
    />
  );
}

export const BlockFormatSection = () => {
  // const [editor] = useLexicalComposerContext();
  // const editorState = useSignalValue(
  //   useExtensionDependency(EditorStateExtension).output
  // );
  // const states = editorState.read(
  //   () => {
  //     const selection = $getSelection();
  //     const isRange = $isRangeSelection(selection);
  //     return {
  //       isBold: isRange && selection.hasFormat('bold'),
  //       isItalic: isRange && selection.hasFormat('italic'),
  //       isStrikethrough: isRange && selection.hasFormat('strikethrough'),
  //       isUnderline: isRange && selection.hasFormat('underline'),
  //       isHighlight: isRange && selection.hasFormat('highlight')
  //     };
  //   },
  //   { editor }
  // );
  return (
    <>
      <HeadingToolbarButton level={1} isActive={false} />
      <HeadingToolbarButton level={2} isActive={false} />
      <HeadingToolbarButton level={3} isActive={false} />
    </>
  );
};
