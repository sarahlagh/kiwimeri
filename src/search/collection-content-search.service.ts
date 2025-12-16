import collectionService from '@/db/collection.service';
import { $getRoot, ElementNode, LexicalEditor, TextNode } from 'lexical';
import storageService from '../db/storage.service';

export type SearchOptions = {
  caseSensitive?: boolean;
};

const defaultOptions: SearchOptions = {
  caseSensitive: false
};

const MIN_INPUT_LENGTH = 2;
const REPLACED_CHARS = /[\n\u00a0]/g;
const LB = ' '; // replace line breaks by space for searching

class CollectionContentSearchService {
  private buildRegex(searchText: string, searchOptions: SearchOptions) {
    const regexFlags = searchOptions.caseSensitive === true ? 'g' : 'gi';
    return new RegExp(searchText, regexFlags);
  }

  public acceptsSearchText(searchText?: string | null) {
    return searchText && searchText.length >= MIN_INPUT_LENGTH;
  }

  public searchDocumentContent(
    rowId: string,
    searchText: string,
    searchOptions?: SearchOptions
  ) {
    if (!this.acceptsSearchText(searchText)) return false;
    searchOptions = { ...defaultOptions, ...searchOptions };
    const regex = this.buildRegex(searchText, searchOptions);

    const plainText =
      storageService
        .getStore()
        .getCell('search', rowId, 'contentPreview')
        ?.toString() || '';
    if (regex.exec(plainText.replaceAll(REPLACED_CHARS, ' ')) !== null)
      return true;
    const pages = collectionService.getDocumentPages(rowId);
    for (const page of pages) {
      const pageText =
        storageService
          .getStore()
          .getCell('search', page.id, 'contentPreview')
          ?.toString() || '';
      if (regex.exec(pageText.replaceAll(REPLACED_CHARS, ' ')) !== null)
        return true;
    }
    return false;
  }

  public *searchArbitraryText(
    text: string,
    searchText: string,
    searchOptions?: SearchOptions
  ) {
    if (!this.acceptsSearchText(searchText)) return null;
    searchOptions = { ...defaultOptions, ...searchOptions };
    const regex = this.buildRegex(searchText, searchOptions);
    let result = regex.exec(text.replaceAll(REPLACED_CHARS, ' '));
    while (result) {
      yield {
        startOffset: result.index,
        endOffset: searchText.length + result.index
      };
      result = regex.exec(text.replaceAll(REPLACED_CHARS, ' '));
    }
    return null;
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
    if (!this.acceptsSearchText(searchText)) return;
    searchOptions = { ...defaultOptions, ...searchOptions };
    const regex = this.buildRegex(searchText!, searchOptions);

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
          let endOffset = startOffset + searchText!.length;
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
                  endOffset = startOffset + searchText!.length;
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
