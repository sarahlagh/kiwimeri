import { CollectionItem } from '@/collection/collection';
import { Notebook } from '@/notebooks/notebooks';
import { CellSchema } from 'tinybase/with-schemas';

type collectionItemKeyEnum = keyof Required<Omit<CollectionItem, 'id'>>;
type notebooksKeyEnum = keyof Required<Omit<Notebook, 'id'>>;

export type SpaceType = [
  {
    collection: {
      [cellId in collectionItemKeyEnum]: CellSchema;
    };

    notebooks: {
      [cellId in notebooksKeyEnum]: CellSchema;
    };
  },
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {} // could include overrides for theme, currentXXX on user demand
];
