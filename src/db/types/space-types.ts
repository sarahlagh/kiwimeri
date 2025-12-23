import {
  CollectionItem,
  HistorizedCollectionItem,
  HistorizedDocumentPagesRelation
} from '@/collection/collection';
import { ValueIdFromSchema } from 'tinybase/@types/_internal/store/with-schemas';
import { CellSchema, Value } from 'tinybase/with-schemas';

type collectionItemKeyEnum = keyof Required<Omit<CollectionItem, 'id'>>;
type historyKeyEnum = keyof Required<Omit<HistorizedCollectionItem, 'id'>>;
type historyDocPagesKeyEnum = keyof Required<
  Omit<HistorizedDocumentPagesRelation, 'id'>
>;

export type SpaceType = [
  {
    collection: {
      [cellId in collectionItemKeyEnum]: CellSchema;
    };
    history: {
      [cellId in historyKeyEnum]: CellSchema;
    };
    history_doc_pages: {
      [cellId in historyDocPagesKeyEnum]: CellSchema;
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
