import {
  CollectionItem,
  CollectionItemResult,
  CollectionItemUpdate,
  sortBy
} from '@/collection/collection';
import z from 'zod';
import { ZipMetadata } from './model-export';

// TODO remove zod, not used enough
export const ZipMetadataSchema = z.object({
  format: z.enum(['markdown']).optional(),
  // type: z.enum(CollectionItemType).optional(),
  type: z.string().optional(),
  title: z.string().optional(),
  created: z.number().optional(),
  updated: z.number().optional(),
  tags: z.array(z.string()).optional(),
  order: z.number().optional(),
  display_opts: z
    .object({
      sort: z
        .object({
          by: z.enum(sortBy),
          descending: z.boolean()
        })
        .refine(val => val.by !== 'order' || val.descending === false)
    })
    .optional(),
  files: z.object().optional()
});

export type ZipMergeFistLevel = {
  status: 'new' | 'merged';
} & Pick<CollectionItem, 'id' | 'title' | 'type' | 'created' | 'updated'>;

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
