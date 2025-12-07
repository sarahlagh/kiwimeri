import platformService from '@/common/services/platform.service';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, ElementNode, TextNode } from 'lexical';

type SearchHighlightPluginProps = {
  searchText?: string | null;
};

// note: only enabled if CSS.highlights is supported

const SEARCH_RESULTS = 'kiwimeri-search-results';

export function SearchHighlightPlugin({
  searchText
}: SearchHighlightPluginProps) {
  const [editor] = useLexicalComposerContext();
  if (!platformService.hasHighlightSupport()) {
    return null;
  }
  if (!searchText || searchText.length < 2) {
    // not searching, return
    console.debug('clear highlights');
    CSS.highlights.delete(SEARCH_RESULTS);
    return null;
  }

  console.log('search for', searchText);

  editor.read(() => {
    const strLength = searchText.length;
    const regex = new RegExp(searchText, 'g'); // gi for case insensitive - should be an option
    const children = $getRoot().getChildren();

    function createRange(
      textNode: TextNode,
      startOffset: number,
      endOffset: number
    ) {
      editor.getElementByKey(textNode.getKey());
      const el = editor.getElementByKey(textNode.getKey());
      if (!el) return null;
      const range = new Range();
      range.setStart(el.firstChild!, startOffset);
      range.setEnd(el.firstChild!, endOffset);
      return range;
    }

    try {
      const ranges: Range[] = [];
      for (const child of children) {
        if (child instanceof ElementNode) {
          let result;
          const fullText = child.getTextContent();
          const allTextNodes = child.getAllTextNodes();
          while ((result = regex.exec(fullText))) {
            const startOffset = result.index;
            const endOffset = startOffset + strLength;
            // go to node at position
            let currentOffset = 0;
            for (const textNode of allTextNodes) {
              const nodeText = textNode.getTextContent();
              currentOffset += nodeText.length;
              if (currentOffset >= startOffset) {
                // found the node
                if (
                  nodeText.length >=
                  endOffset - (currentOffset - nodeText.length)
                ) {
                  // all in this node
                  const nodeStartOffset =
                    startOffset - (currentOffset - nodeText.length);
                  const nodeEndOffset = nodeStartOffset + strLength;
                  const range = createRange(
                    textNode,
                    nodeStartOffset,
                    nodeEndOffset
                  );
                  if (range) ranges.push(range);
                } else {
                  // spans multiple nodes
                  const nodeStartOffset =
                    startOffset - (currentOffset - nodeText.length);
                  const range = createRange(
                    textNode,
                    nodeStartOffset,
                    nodeText.length
                  );
                  if (range) ranges.push(range);
                  // continue to next nodes
                  let remainingLength =
                    endOffset -
                    (currentOffset - nodeText.length) -
                    nodeText.length;
                  let nextIndex = allTextNodes.indexOf(textNode) + 1;
                  while (
                    remainingLength > 0 &&
                    nextIndex < allTextNodes.length
                  ) {
                    const nextNode = allTextNodes[nextIndex];
                    const nextNodeText = nextNode.getTextContent();
                    if (nextNodeText.length >= remainingLength) {
                      // ends in this node
                      const range = createRange(nextNode, 0, remainingLength);
                      if (range) ranges.push(range);
                      remainingLength = 0;
                    } else {
                      // whole node
                      const range = createRange(
                        nextNode,
                        0,
                        nextNodeText.length
                      );
                      if (range) ranges.push(range);
                      remainingLength -= nextNodeText.length;
                    }
                    nextIndex++;
                  }
                }
                break;
              }
            }
          }
        }
      }
      const highlight = new Highlight(...ranges);
      CSS.highlights.set(SEARCH_RESULTS, highlight);
    } catch (e) {
      console.error('Error during search highlight', e);
    }
  });

  return null;
}
