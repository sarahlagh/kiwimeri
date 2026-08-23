import {
  SerializedSelectedNode,
  SerializedSelection
} from '@/domain/collection/resume-state';
import {
  $caretFromPoint,
  $createRangeSelection,
  $getChildCaret,
  $getRoot,
  $getSelection,
  $isElementNode,
  CaretDirection,
  EditorState,
  ElementNode,
  LexicalNode,
  NodeCaret,
  RangeSelection,
  SerializedElementNode,
  SerializedLexicalNode,
  TextNode
} from 'lexical';

const is = (node1: SerializedSelectedNode, node2: SerializedSelectedNode) =>
  node1.index === node2.index &&
  node1.offset === node2.offset &&
  node1.type === node2.type;

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

export const serializeSelection = (
  editorState: EditorState
): SerializedSelection | null => {
  let serializedSelection: SerializedSelection | null = null;
  editorState.read(() => {
    const selection = $getSelection();
    if (selection && selection.getStartEndPoints()) {
      const rangeSelection = selection as RangeSelection;
      const [start, end] = rangeSelection.getStartEndPoints()!;
      const startCaret = $caretFromPoint(start, 'next');
      const endCaret = $caretFromPoint(end, 'next');
      let serializedAnchor: SerializedSelectedNode | undefined = undefined;
      let serializedFocus: SerializedSelectedNode | undefined = undefined;
      let index = 0;
      for (const caret of $iterCaretsDepthFirst(
        $getChildCaret($getRoot(), 'next')
      )) {
        if (caret.isSameNodeCaret(startCaret)) {
          serializedAnchor = {
            index,
            offset: start.offset,
            type: start.type
          };
        }
        if (caret.isSameNodeCaret(endCaret)) {
          serializedFocus = {
            index,
            offset: end.offset,
            type: end.type
          };
          break;
        }
        index++;
      }
      if (serializedFocus) {
        serializedSelection = {
          focus: serializedFocus,
          format: rangeSelection.format
        };
        // only serialize anchor if defined and different from focus
        if (serializedAnchor && !is(serializedAnchor, serializedFocus)) {
          serializedSelection.anchor = serializedAnchor;
        }
      }
    }
  });
  return serializedSelection;
};

export const deserializeSelection = (
  serializedSelection?: SerializedSelection | null
) => {
  if (!serializedSelection) return null;
  let index = 0;
  let anchorCaret: NodeCaret<'next'> | undefined = undefined;
  let focusCaret: NodeCaret<'next'> | undefined = undefined;
  const focusOffset = serializedSelection.focus.offset;
  const anchorOffset = serializedSelection.anchor?.offset || focusOffset;
  for (const caret of $iterCaretsDepthFirst(
    $getChildCaret($getRoot(), 'next')
  )) {
    if (
      serializedSelection.anchor &&
      serializedSelection.anchor.index === index
    ) {
      anchorCaret = caret;
    }
    if (serializedSelection.focus.index === index) {
      focusCaret = caret;
      if (!serializedSelection.anchor) {
        anchorCaret = caret;
      }
      break;
    }
    index++;
  }
  if (anchorCaret && focusCaret) {
    if (serializedSelection.focus.type === 'text') {
      const rangeSelection = $createRangeSelection();
      const anchorNode = anchorCaret.origin as TextNode;
      const focusNode = focusCaret.origin as TextNode;
      rangeSelection.setTextNodeRange(
        anchorNode,
        anchorOffset,
        focusNode,
        focusOffset
      );
      rangeSelection.format = serializedSelection.format;
      return rangeSelection;
    } else if (serializedSelection.focus.type === 'element') {
      return focusCaret.origin.selectStart();
    }
  }
  return null;
};

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

export const serializeNode = (node: LexicalNode | null) => {
  if (!node || !(node instanceof ElementNode)) return null;
  return exportNodeToJSON(node);
};
