import { CollectionItemTypeValues } from '@/collection/collection';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { $getRoot, ElementNode, LexicalEditor, TextNode } from 'lexical';
import storageService from '../db/storage.service';
import { searchService } from './collection-search.service';

export type DeepSearchResult = {
  id: string;
  type: CollectionItemTypeValues;
  shortBreadcrumb: string;
  title?: string;
  preview: string;
  firstMatch: {
    startOffset: number;
    endOffset: number;
  };
  nbMatches: number;
};

export type DeepSearchOptions = {
  scope?: string; // notebook or folder id
  searchInTitle?: boolean;
  previewLength?: number;
  previewTextBefore?: number;
  previewTextAfter?: number;
};

export type SearchOptions = {
  caseSensitive?: boolean;
};

const defaultDeepSearchOptions: Required<Omit<DeepSearchOptions, 'scope'>> = {
  searchInTitle: true,
  previewLength: 80,
  previewTextBefore: 10,
  previewTextAfter: 10
};

const defaultOptions: Required<SearchOptions> = {
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

  public deepSearch(
    searchText: string | null | undefined,
    searchOptions?: DeepSearchOptions & SearchOptions
  ): DeepSearchResult[] {
    if (!this.acceptsSearchText(searchText)) return [];
    searchOptions = {
      ...defaultOptions,
      ...defaultDeepSearchOptions,
      ...searchOptions
    };
    if (!searchOptions.scope) {
      searchOptions.scope = notebooksService.getCurrentNotebook();
    }
    console.debug('search options', searchOptions);
    const results: DeepSearchResult[] = [];
    // return item title, type, full plainText content preview, & first match (startOffset, endOffset)
    // if option to include title on, title in text content to search
    const searchTable = storageService.getStore().getTable('search');
    const collectionTable = storageService.getSpace().getTable('collection');
    searchService.getChildren(searchOptions.scope).forEach(rowId => {
      const row = searchTable[rowId];
      const item = collectionTable[rowId];
      if (!row || !item) return;
      if (!searchOptions.searchInTitle && !row.contentPreview) return;
      const title = item.title?.toString();
      const content =
        (searchOptions.searchInTitle ? title + ' ' : '') +
        row.contentPreview?.toString();

      // TODO separate title from content
      // nbMatches should be for content

      const searchGen = this.searchArbitraryText(
        content,
        searchText!,
        searchOptions
      );
      const firstMatch = searchGen.next();
      let nbMatches = 1;
      if (firstMatch.value !== null) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const nextMatch of searchGen) {
          nbMatches++;
        }
        const result: DeepSearchResult = {
          id: rowId,
          type: item.type as CollectionItemTypeValues,
          title,
          shortBreadcrumb: row.breadcrumb as string,
          preview: content.substring(
            Math.max(
              0,
              firstMatch.value.startOffset - searchOptions.previewTextBefore!
            ),
            Math.min(
              firstMatch.value.startOffset +
                firstMatch.value.endOffset +
                searchOptions.previewTextAfter!,
              firstMatch.value.startOffset + searchOptions.previewLength!
            )
          ),
          firstMatch: firstMatch.value,
          nbMatches
        };
        results.push(result);
      }
    });
    return results;
  }
}

export const contentSearchService = new CollectionContentSearchService();
