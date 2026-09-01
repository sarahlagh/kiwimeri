import { SerializedSelection } from '@/domain/collection/resume-state';
import { LexicalDiff } from '@/domain/document-edits/document-edits';
import {
  $caretFromPoint,
  $createRangeSelection,
  $getChildCaret,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRootNode,
  BaseSelection,
  CaretDirection,
  EditorState,
  ElementNode,
  LexicalNode,
  NodeCaret,
  RangeSelection,
  SerializedElementNode,
  SerializedLexicalNode,
  TextNode,
  UpdateListenerPayload
} from 'lexical';

function* $iterCaretsDepthFirst<D extends CaretDirection>(
  startCaret: NodeCaret<D>
): Iterable<NodeCaret<D>> {
  const cachedNodes = new WeakSet();
  function step(prevCaret: NodeCaret<D>): null | NodeCaret<D> {
    // Get the adjacent SiblingCaret
    const nextCaret = prevCaret.getAdjacentCaret();
    return (
      // If there is a sibling, try and get a ChildCaret from it
      (nextCaret && nextCaret.getChildCaret()) ||
      // Return the sibling if there is one
      nextCaret ||
      // Return a SiblingCaret of the parent, if there is one
      prevCaret.getParentCaret('root')
    );
  }

  for (let caret = step(startCaret); caret !== null; caret = step(caret)) {
    if (!cachedNodes.has(caret.origin)) {
      cachedNodes.add(caret.origin);
      yield caret;
    }
  }
}

function exportNodeToJSON<SerializedNode extends SerializedLexicalNode>(
  node: LexicalNode
): SerializedNode {
  const serializedNode = node.exportJSON();
  const nodeClass = node.constructor;

  if (serializedNode.type !== nodeClass.getType()) {
    throw new Error(
      `LexicalNode: Node ${nodeClass.name} does not match the serialized type. Check if .exportJSON() is implemented and it is returning the correct type.`
    );
  }

  if ($isElementNode(node)) {
    const serializedChildren = (serializedNode as SerializedElementNode)
      .children;
    if (!Array.isArray(serializedChildren)) {
      throw new Error(
        `LexicalNode: Node %s is an element but .exportJSON() does not have a children array.`
      );
    }

    const children = node.getChildren();

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const serializedChildNode = exportNodeToJSON(child);
      serializedChildren.push(serializedChildNode);
    }
  }

  // @ts-expect-error should have at least one element node
  return serializedNode;
}

export function serializeNode(node: LexicalNode) {
  return exportNodeToJSON(node);
}

export function getChangedBlocks({
  dirtyElements,
  dirtyLeaves,
  prevEditorState
}: UpdateListenerPayload) {
  const blocksChanged: LexicalDiff[] = [];
  let hasDeletedNodes = false;
  for (const key of dirtyElements.keys()) {
    if (key === 'root') continue;
    const node = $getNodeByKey(key);
    if (node === null) {
      hasDeletedNodes = true;
      break;
    }
    if (!$isRootNode(node?.getParent())) continue; // only care for top level blocks
    const serializedNode = serializeNode(node);
    const idx = node!.getIndexWithinParent();
    blocksChanged.push({ block: serializedNode, idx });
  }
  for (const key of dirtyLeaves.keys()) {
    const node = $getNodeByKey(key);
    if (!node) {
      const previousNode = prevEditorState._nodeMap.get(key);
      // TODO not ideal
      if (previousNode?.__parent === 'root') {
        hasDeletedNodes = true;
        break;
      }
      continue;
    }
    // node is not null
    if (!$isRootNode(node.getParent())) continue; // only care for top level blocks
    const serializedNode = serializeNode(node);
    const idx = node!.getIndexWithinParent();
    blocksChanged.push({ block: serializedNode, idx });
  }
  return { blocksChanged, hasDeletedNodes };
}

export function serializeSelection(
  editorState: EditorState
): SerializedSelection | null {
  let serializedSelection: SerializedSelection | null = null;
  editorState.read(() => {
    const selection = $getSelection();
    if (selection && selection.getStartEndPoints()) {
      const rangeSelection = selection as RangeSelection;
      const [, end] = rangeSelection.getStartEndPoints()!;
      const endCaret = $caretFromPoint(end, 'next');
      const block = endCaret.getParentAtCaret();
      if (!block) return;
      const blockNode = $getNodeByKey(block.getKey());
      if (blockNode) {
        serializedSelection = {
          focus: {
            blockIndex: block.getIndexWithinParent(),
            leafIndex: end.getNode().getIndexWithinParent(),
            offset: end.offset,
            type: end.type
          },
          format: rangeSelection.format
        };
      }
    }
  });
  return serializedSelection;
}

export function deserializeSelection(
  serializedSelection?: SerializedSelection | null
): BaseSelection | null {
  if (!serializedSelection) return null;
  if (serializedSelection.focus.type === 'text') {
    const rangeSelection = $createRangeSelection();
    const block = $getRoot().getChildren()[
      serializedSelection.focus.blockIndex
    ] as ElementNode;
    if (block) {
      let index = 0;
      let focusCaret: NodeCaret<'next'> | undefined = undefined;
      const focusOffset = serializedSelection.focus.offset;
      for (const caret of $iterCaretsDepthFirst(
        $getChildCaret(block, 'next')
      )) {
        if (serializedSelection.focus.leafIndex === index) {
          focusCaret = caret;
          break;
        }
        index++;
      }
      if (focusCaret) {
        const focusNode = focusCaret.origin as TextNode;
        rangeSelection.setTextNodeRange(
          focusNode,
          focusOffset,
          focusNode,
          focusOffset
        );
      }
      rangeSelection.format = serializedSelection.format;
    }
    return rangeSelection;
  }
  return null;
}
