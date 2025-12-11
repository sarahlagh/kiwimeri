import { $getRoot, ElementNode, LexicalEditor, TextNode } from 'lexical';
import storageService from '../db/storage.service';

export type SearchOptions = {
  caseInsensitive?: boolean;
};

const defaultOptions: SearchOptions = {
  caseInsensitive: false
};

const MIN_INPUT_LENGTH = 2;
const REPLACED_CHARS = /[\n\u00a0]/g;
const LB = ' '; // replace line breaks by space for searching

class CollectionContentSearchService {
  private buildRegex(searchText: string, searchOptions: SearchOptions) {
    const regexFlags = searchOptions.caseInsensitive === true ? 'gi' : 'g';
    return new RegExp(searchText, regexFlags);
  }

  public searchPlainTextContent(
    rowId: string,
    searchText: string,
    searchOptions?: SearchOptions
  ) {
    if (searchText.length < MIN_INPUT_LENGTH) return false;
    searchOptions = { ...defaultOptions, ...searchOptions };
    const regex = this.buildRegex(searchText, searchOptions);

    const plainText =
      storageService
        .getStore()
        .getCell('search', rowId, 'contentPreview')
        ?.toString() || '';
    return regex.exec(plainText.replaceAll(REPLACED_CHARS, ' ')) !== null;
  }

  public searchLexicalState(
    editor: LexicalEditor,
    searchText: string | null,
    createResult: (
      textNode: TextNode,
      startOffset: number,
      endOffset: number
    ) => void,
    searchOptions?: SearchOptions
  ) {
    if (!searchText || searchText.length < MIN_INPUT_LENGTH) {
      return;
    }
    searchOptions = { ...defaultOptions, ...searchOptions };
    const regex = this.buildRegex(searchText, searchOptions);

    editor.read(() => {
      const children = $getRoot().getChildren();
      const fullText = $getRoot().getTextContent();
      const fullTextMask = fullText.replaceAll(/\n+/g, '\n');
      const fullTextSearch = fullTextMask.replaceAll(REPLACED_CHARS, LB);
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
                const nodeStartOffset = Math.max(
                  0,
                  startOffset - currentOffset
                );
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
                currentOffset += LB.length;
              }
            }
          }
        }
      } catch (e) {
        console.error('error during lexical search', e);
      }
    });
  }
}

export const contentSearchService = new CollectionContentSearchService();
