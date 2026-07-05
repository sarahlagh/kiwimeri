import { CollectionItemTypeValues } from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import { getDerivedId } from '@/domain/collection/document-content';
import notebooksService from '@/domain/collection/notebooks.service';
import {
  DeepSearchOptions,
  DeepSearchResult,
  defaultDeepSearchOptions,
  defaultOptions,
  SearchOptions
} from './types';

export const MIN_INPUT_LENGTH = 2;
export const REPLACED_CHARS = /[\n\u00a0]/g;
export const PREVIEW_LENGTH = 80;
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
    collectionService.getAllChildrenIds(searchOptions.scope).forEach(itemId => {
      const item = collectionService.getItem(itemId);
      const shortPath = collectionService.getBreadcrumb(itemId);
      const plainText = collectionService.getDocumentPlainText(
        getDerivedId('c', itemId)
      );
      if (!shortPath || !item) return;
      if (!searchOptions.searchInTitle && !plainText) return;
      const title = item.title?.toString() || '';

      const result: DeepSearchResult = {
        id: itemId,
        type: item.type as CollectionItemTypeValues,
        title,
        shortBreadcrumb: shortPath as string[]
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
        const content = plainText?.toString() || '';
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
