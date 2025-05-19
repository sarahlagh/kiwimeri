import { CollectionItem } from '@/collection/collection';
import { CellSchema } from 'tinybase/with-schemas';

type collectionItemKeyEnum = keyof Required<Omit<CollectionItem, 'id'>>;

export type SpaceType = [
  {
    collection: {
      [cellId in collectionItemKeyEnum]: CellSchema;
    };
  },
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {} // could include overrides for theme, currentXXX on user demand
];
