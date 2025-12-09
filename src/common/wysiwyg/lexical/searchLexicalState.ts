import { $getRoot, ElementNode, LexicalEditor, TextNode } from 'lexical';

export type SearchLexicalStateOptions = {
  caseInsensitive?: boolean;
  lineBreakReplacement?: string;
};

const defaultOptions: SearchLexicalStateOptions = {
  caseInsensitive: false,
  lineBreakReplacement: ' '
};

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
  const lb = searchOptions.lineBreakReplacement || ' '; // replace line breaks for searching

  editor.read(() => {
    const children = $getRoot().getChildren();
    try {
      for (const child of children) {
        if (child instanceof ElementNode) {
          let result;

          const fullText = child.getTextContent().replaceAll(/\n{1,2}/g, lb);
          const fullTextMask = child.getTextContent().replaceAll(/\n\n/g, '\n');
          const allTextNodes = child.getAllTextNodes();
          while ((result = regex.exec(fullText))) {
            const startOffset = result.index;
            const endOffset = startOffset + searchText.length;
            let currentOffset = 0;
            for (const textNode of allTextNodes) {
              const nodeText = textNode.getTextContent();
              if (fullTextMask[currentOffset] === '\n') {
                // account for linebreaks between different parents
                currentOffset += lb.length;
              }
              if (currentOffset >= endOffset) {
                break;
              }
              if (currentOffset + nodeText.length > startOffset) {
                const nodeStartOffset = Math.max(
                  0,
                  startOffset - currentOffset
                );
                const nodeEndOffset = Math.min(
                  nodeText.length,
                  endOffset - currentOffset
                );
                createResult(textNode, nodeStartOffset, nodeEndOffset);
              }
              currentOffset += nodeText.length;
            }
          }
        }
      }
    } catch (e) {
      console.error('error during lexical search', e);
    }
  });
};
