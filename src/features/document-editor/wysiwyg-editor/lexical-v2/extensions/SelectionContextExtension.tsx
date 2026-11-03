import { Signal, signal } from '@lexical/extension';
import { $isAutoLinkNode, $isLinkNode } from '@lexical/link';
import { $isListNode, ListNode, ListType } from '@lexical/list';
import { useExtensionSignalValue } from '@lexical/react/useExtensionSignalValue';
import { $isHeadingNode, HeadingTagType } from '@lexical/rich-text';
import { $getNearestNodeOfType } from '@lexical/utils';
import {
  $findMatchingParent,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $onUpdate,
  COMMAND_PRIORITY_CRITICAL,
  defineExtension,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
  mergeRegister,
  RangeSelection,
  SELECTION_CHANGE_COMMAND
} from 'lexical';
import { getSelectedNode } from '../utils/getSelectedNode';

export type SelectionContext = {
  isTextOrElementSelection: boolean; // not just a cursor
  isSelectionOverMultipleBlocks: boolean;
  wordUnderCursor?: [number, number, string];
  isBold: boolean;
  isItalic: boolean;
  isStrikethrough: boolean;
  isUnderline: boolean;
  isHighlight: boolean;
  blockType: string;
  headingTag?: HeadingTagType;
  listType?: ListType;
  elementFormat: ElementFormatType; // text-align
  links: {
    isLink: boolean;
    isAutoLink: boolean;
    isAutoLinkUnlinked: boolean;
    linkUrl?: string;
    linkText?: string;
    hasMultipleLinks: boolean;
  };
};

const INITIAL_SELECTION_CONTEXT: SelectionContext = {
  isTextOrElementSelection: false,
  isSelectionOverMultipleBlocks: false,
  isBold: false,
  isHighlight: false,
  isItalic: false,
  isStrikethrough: false,
  isUnderline: false,
  blockType: 'paragraph',
  elementFormat: 'left',
  links: {
    isLink: false,
    isAutoLink: false,
    isAutoLinkUnlinked: false,
    hasMultipleLinks: false
  }
};

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

function $findWordUnderCursor(
  selection: RangeSelection
): [number, number, string] | undefined {
  const [, end] = selection.getStartEndPoints()!;
  const node = end.getNode();
  const idx = end.offset;
  const textContent = node.getTextContent();
  const m1 = textContent.substring(0, idx).matchAll(/(\W)/g).toArray();
  const m2 = textContent.substring(idx).match(/(\W)/);
  const idx1 =
    m1[m1.length - 1]?.index !== undefined ? m1[m1.length - 1].index + 1 : 0;
  const idx2 = m2?.index !== undefined ? idx + m2.index : textContent.length;
  const wordUnderCursor = textContent.substring(idx1, idx2);
  if (wordUnderCursor.length > 0) return [idx1, idx2, wordUnderCursor];
  return undefined;
}

function $updateSelectionContext(
  editor: LexicalEditor,
  selectionContextSignal: Signal<SelectionContext>
) {
  const selection = $getSelection();
  const isRange = $isRangeSelection(selection);
  const newSelectionContext = structuredClone(INITIAL_SELECTION_CONTEXT);

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
    } else {
      newSelectionContext.wordUnderCursor = $findWordUnderCursor(selection);
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
    }

    // text format
    newSelectionContext.isBold = selection.hasFormat('bold');
    newSelectionContext.isItalic = selection.hasFormat('italic');
    newSelectionContext.isStrikethrough = selection.hasFormat('strikethrough');
    newSelectionContext.isUnderline = selection.hasFormat('underline');
    newSelectionContext.isHighlight = selection.hasFormat('highlight');
  }

  selectionContextSignal.value = newSelectionContext;
}

export const SelectionContextExtension = defineExtension({
  name: '@kiwimeri/rich-text/selection-context',
  namespace: 'react-rich',
  build() {
    return {
      selectionContext: signal<SelectionContext>(
        structuredClone(INITIAL_SELECTION_CONTEXT)
      )
    };
  },
  register(editor, config, state) {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateSelectionContext(editor, state.getOutput().selectionContext);
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $onUpdate(() =>
            editor.read('latest', () =>
              $updateSelectionContext(
                editor,
                state.getOutput().selectionContext
              )
            )
          );
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );
  }
});

export function useSelectionContext() {
  return useExtensionSignalValue(SelectionContextExtension, 'selectionContext');
}
