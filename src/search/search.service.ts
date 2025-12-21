import { CollectionItemTypeValues } from '@/collection/collection';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { $getRoot, ElementNode, LexicalEditor, TextNode } from 'lexical';
import storageService from '../db/storage.service';
import { searchAncestryService } from './search-ancestry.service';

export type DeepSearchResult = {
  id: string;
  type: CollectionItemTypeValues;
  shortBreadcrumb: string;
  title?: string;
  preview?: string;
  firstContentMatch?: {
    startOffset: number;
    endOffset: number;
    realStartOffset: number;
    realEndOffset: number;
  };
  firstTitleMatch?: {
    startOffset: number;
    endOffset: number;
  };
  nbContentMatches?: number;
};

export type DeepSearchOptions = {
  scope?: string; // notebook or folder id
  searchInTitle?: boolean;
  searchInContent?: boolean;
};

export type SearchOptions = {
  caseSensitive?: boolean;
};

const defaultDeepSearchOptions: Required<Omit<DeepSearchOptions, 'scope'>> = {
  searchInTitle: true,
  searchInContent: true
};

const defaultOptions: Required<SearchOptions> = {
  caseSensitive: false
};

const MIN_INPUT_LENGTH = 2;
const REPLACED_CHARS = /[\n\u00a0]/g;
const LB = ' '; // replace line breaks by space for searching
const PREVIEW_LENGTH = 80;
const PREVIEW_BEFORE = 10;
const PREVIEW_AFTER = 50;

class CollectionContentSearchService {
  private buildRegex(searchText: string, searchOptions: SearchOptions) {
    const regexFlags = searchOptions.caseSensitive === true ? 'g' : 'gi';
    return new RegExp(searchText, regexFlags);
  }

  public acceptsSearchText(searchText?: string | null) {
    return searchText && searchText.length >= MIN_INPUT_LENGTH;
  }

  public searchInPages(
    rowId: string,
    searchText: string,
    searchOptions?: SearchOptions
  ) {
    if (!this.acceptsSearchText(searchText)) return [];
    searchOptions = { ...defaultOptions, ...searchOptions };
    const regex = this.buildRegex(searchText, searchOptions);
    const ids: string[] = [];

    const plainText =
      storageService
        .getStore()
        .getCell('search', rowId, 'contentPreview')
        ?.toString() || '';
    if (regex.exec(plainText.replaceAll(REPLACED_CHARS, ' ')) !== null)
      ids.push(rowId);
    const pages = collectionService.getDocumentPages(rowId);
    for (const page of pages) {
      const pageText =
        storageService
          .getStore()
          .getCell('search', page.id, 'contentPreview')
          ?.toString() || '';
      if (regex.exec(pageText.replaceAll(REPLACED_CHARS, ' ')) !== null)
        ids.push(page.id);
    }
    return ids;
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
      const fullTextMask = fullText.replaceAll(/\n+/g, '\n').trimStart();
      const fullTextSearch = fullTextMask
        .replaceAll(REPLACED_CHARS, LB)
        .trimStart();
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
              while (
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
                if (nodeEndOffset < endOffset - currentOffset) {
                  break;
                }
                result = regex.exec(fullTextSearch);
                if (!result) {
                  break root;
                }
                startOffset = result.index;
                endOffset = startOffset + searchText!.length;
              }
              currentOffset += nodeText.length;
              // account for linebreaks between different parents
              while (fullTextMask[currentOffset] === '\n') {
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
    const results: DeepSearchResult[] = [];
    const searchTable = storageService.getStore().getTable('search');
    const collectionTable = storageService.getSpace().getTable('collection');
    searchAncestryService.getChildren(searchOptions.scope).forEach(rowId => {
      const row = searchTable[rowId];
      const item = collectionTable[rowId];
      if (!row || !item) return;
      if (!searchOptions.searchInTitle && !row.contentPreview) return;
      const title = item.title?.toString() || '';

      const result: DeepSearchResult = {
        id: rowId,
        type: item.type as CollectionItemTypeValues,
        title,
        shortBreadcrumb: row.breadcrumb as string // TODO resolve to titles
      };

      // optionally search in title
      if (searchOptions.searchInTitle) {
        const search = this.searchArbitraryText(
          title,
          searchText!,
          searchOptions
        );
        const firstMatch = search.next();
        if (firstMatch.value !== null) {
          result.firstTitleMatch = firstMatch.value;
        }
      }

      // optionally search in content
      if (searchOptions.searchInContent) {
        const content = row.contentPreview?.toString() || '';
        const search = this.searchArbitraryText(
          content,
          searchText!,
          searchOptions
        );
        const firstMatch = search.next();
        let nbMatches = 0;
        if (firstMatch.value !== null) {
          const startPreview = Math.max(
            0,
            firstMatch.value.startOffset - PREVIEW_BEFORE
          );
          result.preview = content.substring(
            startPreview,
            Math.min(
              firstMatch.value.startOffset +
                firstMatch.value.endOffset +
                PREVIEW_AFTER,
              firstMatch.value.startOffset + PREVIEW_LENGTH
            )
          );
          result.firstContentMatch = {
            startOffset: firstMatch.value.startOffset - startPreview,
            endOffset: Math.min(
              firstMatch.value.endOffset - startPreview,
              result.preview.length
            ),
            realStartOffset: firstMatch.value.startOffset,
            realEndOffset: firstMatch.value.endOffset
          };

          nbMatches++;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          for (const nextMatch of search) {
            nbMatches++;
            if (nbMatches > 50) break; // no need to display more
          }
        }
        result.nbContentMatches = nbMatches;
      }

      if (result.firstContentMatch || result.firstTitleMatch) {
        results.push(result);
      }
    });
    return results;
  }
}

export const searchService = new CollectionContentSearchService();
