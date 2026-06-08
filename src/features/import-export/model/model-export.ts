import {
  CollectionItem,
  CollectionItemDisplayOpts
} from '@/collection/collection';

export type ZipFileTree = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type ZipExportOptions = {
  includeMetadata?: boolean;
};

export type ZipMetadata = Partial<
  Pick<
    CollectionItem,
    'type' | 'title' | 'created' | 'updated' | 'tags' | 'order'
  >
> & {
  display_opts?: CollectionItemDisplayOpts;
  format?: 'markdown';
  files?: {
    [key: string]: ZipMetadata;
  };
};
