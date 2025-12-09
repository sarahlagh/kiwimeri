import { $getRoot, ElementNode, LexicalEditor, TextNode } from 'lexical';

export type SearchLexicalStateOptions = {
  caseInsensitive?: boolean;
};

const defaultOptions: SearchLexicalStateOptions = {
  caseInsensitive: false
};

const lb = ' '; // replace line breaks by space for searching

export const searchLexicalState = (
  editor: LexicalEditor,
  searchText: string | null,
  createResult: (
    textNode: TextNode,
    startOffset: number,
    endOffset: number
  ) => void,
  searchOptions?: SearchLexicalStateOptions
) => {
  if (!searchText || searchText.length < 2) {
    return;
  }
  searchOptions = { ...defaultOptions, ...searchOptions };
  const regexFlags = searchOptions.caseInsensitive === true ? 'gi' : 'g';
  const regex = new RegExp(searchText, regexFlags);

  editor.read(() => {
    const children = $getRoot().getChildren();
    const fullText = $getRoot().getTextContent();
    const fullTextMask = fullText.replaceAll(/\n+/g, '\n');
    const fullTextSearch = fullTextMask.replaceAll(/\n/g, lb);
    try {
      let currentOffset = 0;
      let result = regex.exec(fullTextSearch);
      if (result) {
        let startOffset = result.index;
        let endOffset = startOffset + searchText.length;
        root: for (const child of children) {
          if (!(child instanceof ElementNode)) {
            continue;
          }
          const allTextNodes = child.getAllTextNodes();
          for (const textNode of allTextNodes) {
            const nodeText = textNode.getTextContent();
            if (
              currentOffset < endOffset &&
              currentOffset + nodeText.length > startOffset
            ) {
              // if is in range, call createResult
              const nodeStartOffset = Math.max(0, startOffset - currentOffset);
              const nodeEndOffset = Math.min(
                nodeText.length,
                endOffset - currentOffset
              );
              createResult(textNode, nodeStartOffset, nodeEndOffset);
              // if end of range, continue searching the rest of the text
              if (nodeEndOffset >= endOffset - currentOffset) {
                result = regex.exec(fullTextSearch);
                if (!result) {
                  break root;
                }
                startOffset = result.index;
                endOffset = startOffset + searchText.length;
              }
            }
            currentOffset += nodeText.length;
            // account for linebreaks between different parents
            if (fullTextMask[currentOffset] === '\n') {
              currentOffset += lb.length;
            }
          }
        }
      }
    } catch (e) {
      console.error('error during lexical search', e);
    }
  });
};
