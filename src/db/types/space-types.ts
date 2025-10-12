import { CollectionItem } from '@/collection/collection';
import { ValueIdFromSchema } from 'tinybase/@types/_internal/store/with-schemas';
import { CellSchema } from 'tinybase/with-schemas';

type collectionItemKeyEnum = keyof Required<Omit<CollectionItem, 'id'>>;

export type SpaceType = [
  {
    collection: {
      [cellId in collectionItemKeyEnum]: CellSchema;
    };
  },
  {
    defaultSortBy: { type: 'string'; default: string };
    defaultSortDesc: { type: 'boolean'; default: false };
  }
];

export type SpaceValue = ValueIdFromSchema<SpaceType[1]>;
