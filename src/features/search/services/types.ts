import { CollectionItemTypeValues } from '@/domain/collection/collection';

export type DeepSearchResult = {
  id: string;
  type: CollectionItemTypeValues;
  shortBreadcrumb: string[];
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

export const defaultOptions: Required<SearchOptions> = {
  caseSensitive: false
};

export const defaultDeepSearchOptions: Required<
  Omit<DeepSearchOptions, 'scope'>
> = {
  searchInTitle: true,
  searchInContent: true
};
