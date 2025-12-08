import { $getRoot, ElementNode, LexicalEditor, TextNode } from 'lexical';

export type SearchLexicalStateOptions = {
  caseInsensitive?: boolean;
  joinSingleLines?: boolean; // TODO
};

const defaultOptions: SearchLexicalStateOptions = {
  caseInsensitive: false,
  joinSingleLines: false
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
  editor.read(() => {
    const strLength = searchText.length;
    const regex = new RegExp(searchText, regexFlags);
    const children = $getRoot().getChildren();

    try {
      for (const child of children) {
        if (child instanceof ElementNode) {
          let result;
          const fullText = child.getTextContent().replaceAll('\n', '');
          const allTextNodes = child.getAllTextNodes();
          while ((result = regex.exec(fullText))) {
            const startOffset = result.index;
            const endOffset = startOffset + strLength;
            let currentOffset = 0;
            for (const textNode of allTextNodes) {
              const nodeText = textNode.getTextContent();
              if (currentOffset > endOffset) {
                break;
              }
              if (currentOffset >= startOffset) {
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
      console.error('Error during search highlight', e);
    }
  });
};
