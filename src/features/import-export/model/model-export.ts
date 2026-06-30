import { CollectionItem } from '@/domain/collection/collection';

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
    'type' | 'title' | 'createdAt' | 'updatedAt' | 'tags' | 'order' | 'settings'
  >
> & {
  format?: 'markdown';
  files?: {
    [key: string]: ZipMetadata;
  };
};
