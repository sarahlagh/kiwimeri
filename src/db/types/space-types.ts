import { CollectionItem } from '@/collection/collection';
import { ValueIdFromSchema } from 'tinybase/@types/_internal/store/with-schemas';
import { CellSchema, Value } from 'tinybase/with-schemas';

type collectionItemKeyEnum = keyof Required<Omit<CollectionItem, 'id'>>;

export type SpaceType = [
  {
    collection: {
      [cellId in collectionItemKeyEnum]: CellSchema;
    };
  },
  {
    lastUpdated: { type: 'number'; default: number };
    defaultSortBy: { type: 'string'; default: string };
    defaultSortDesc: { type: 'boolean'; default: false };
  }
];

export type SpaceValue = ValueIdFromSchema<SpaceType[1]>;

export type SpaceValues = { [key in SpaceValue]: Value<SpaceType[1], key> };

export const defaultOrder = 9999;
