import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import {
  $createHeadingNode,
  $createQuoteNode,
  HeadingTagType
} from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { useLingui } from '@lingui/react/macro';
import {
  $createParagraphNode,
  $getSelection,
  ElementNode,
  LexicalCommand,
  LexicalEditor
} from 'lexical';
import { useEditorContext } from '../EditorContext';
import { ToolbarButton } from './buttons';

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
  isDisabled,
  isActive
}: {
  level: number;
  isDisabled: boolean;
  isActive: boolean;
}) {
  const { t } = useLingui();
  const tag = `h${level}` as HeadingTagType;
  return (
    <SetBlockTypeToolbarButton
      ariaLabel={t`Header ${level}`}
      icon={`writer/type-${tag}.svg`}
      isDisabled={isDisabled}
      isActive={isActive}
      createBlock={() => $createHeadingNode(tag)}
    />
  );
}

function ListToolbarButton({
  editor,
  ariaLabel,
  icon,
  isDisabled,
  isActive,
  command
}: {
  editor: LexicalEditor;
  ariaLabel: string;
  icon: string;
  isDisabled: boolean;
  isActive: boolean;
  command: LexicalCommand<void>;
}) {
  return (
    <ToolbarButton
      ariaLabel={ariaLabel}
      icon={icon}
      isActive={isActive}
      disabled={isDisabled}
      onClick={() => {
        editor.dispatchCommand(
          !isActive ? command : REMOVE_LIST_COMMAND,
          undefined
        );
      }}
    />
  );
}

export const BlockFormatSection = ({ editor }: { editor: LexicalEditor }) => {
  const { selectionContext: selection } = useEditorContext();
  const isEditable = useLexicalEditable();
  const { t } = useLingui();
  const states = {
    isH1: selection.blockType === 'heading' && selection.headingTag === 'h1',
    isH2: selection.blockType === 'heading' && selection.headingTag === 'h2',
    isH3: selection.blockType === 'heading' && selection.headingTag === 'h3',
    isUnorderedList:
      selection.blockType === 'list' && selection.listType === 'bullet',
    isOrderedList:
      selection.blockType === 'list' && selection.listType === 'number',
    isCheckedList:
      selection.blockType === 'list' && selection.listType === 'check',
    isBlockQuote: selection.blockType === 'quote'
  };

  return (
    <>
      <HeadingToolbarButton
        level={1}
        isDisabled={!isEditable}
        isActive={states.isH1}
      />
      <HeadingToolbarButton
        level={2}
        isDisabled={!isEditable}
        isActive={states.isH2}
      />
      <HeadingToolbarButton
        level={3}
        isDisabled={!isEditable}
        isActive={states.isH3}
      />

      <ListToolbarButton
        editor={editor}
        ariaLabel={t`Insert Unordered List`}
        icon="writer/list-ul.svg"
        isActive={states.isUnorderedList}
        isDisabled={!isEditable}
        command={INSERT_UNORDERED_LIST_COMMAND}
      />
      <ListToolbarButton
        editor={editor}
        ariaLabel={t`Insert Ordered List`}
        icon="writer/list-ol.svg"
        isActive={states.isOrderedList}
        isDisabled={!isEditable}
        command={INSERT_ORDERED_LIST_COMMAND}
      />
      <ListToolbarButton
        editor={editor}
        ariaLabel={t`Insert Checked List`}
        icon="writer/list-check.svg"
        isActive={states.isCheckedList}
        isDisabled={!isEditable}
        command={INSERT_CHECK_LIST_COMMAND}
      />

      <SetBlockTypeToolbarButton
        ariaLabel={t`Block Quote`}
        icon="writer/quote.svg"
        isActive={states.isBlockQuote}
        isDisabled={!isEditable}
        createBlock={() => $createQuoteNode()}
      />
    </>
  );
};
