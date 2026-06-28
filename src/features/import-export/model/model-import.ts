import {
  CollectionItem,
  CollectionItemResult,
  CollectionItemUpdate
} from '@/domain/collection/model';
import { ZipMetadata } from './model-export';

export type ZipMergeFistLevel = {
  status: 'new' | 'merged';
} & Pick<CollectionItem, 'id' | 'title' | 'type' | 'createdAt' | 'updatedAt'>;

export type ZipParseError = {
  family: 'incorrect_meta' | 'parse_error';
  code?:
    | 'incorrect_child_type'
    | 'incorrect_parent_type'
    | 'orphaned_folder'
    | 'orphaned_notebook';
  path: string;
};

export type ZipParsedData = {
  zipName: string;
  items: CollectionItem[];
  hasOneFolder: boolean;
  hasNotebooks: boolean;
  hasMetadata: boolean;
  rootMeta?: ZipParsedMetadata;
  errors: ZipParseError[];
};

export type ZipMergeResult = {
  newItems: CollectionItem[];
  updatedItems: CollectionItemUpdate[];
  duplicates: CollectionItemResult[]; // first level duplicates only
  firstLevel: ZipMergeFistLevel[];
};

export type ZipParseOptions = {
  ignoreMetadata?: boolean;
  titleRemoveDuplicateIdentifiers?: boolean;
  titleRemoveExtension?: boolean;
};

export type ZipMergeOptions = {
  createNotebook?: boolean;
  createNewFolder?: boolean;
  removeNotebooks?: boolean;
  overwrite?: boolean;
  removeFirstFolder?: boolean;
  newFolderName?: string;
};

export type ZipImportOptions = ZipParseOptions & ZipMergeOptions;

export type ZipParsedMetadata = {
  parentKey?: string;
  files?: {
    [key: string]: ZipParsedMetadata;
  };
} & ZipMetadata;

export type MultipleImportModalParams = {
  zipData: ZipParsedData;
} & ZipMergeOptions;
