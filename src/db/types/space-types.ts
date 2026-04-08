import {
  CollectionItem,
  CollectionItemVersionContentRow,
  CollectionItemVersionRow,
  DocumentResumeStateRow
} from '@/collection/collection';
import { DocumentStatRow } from '@/stats/document-stats';
import { ValueIdFromSchema } from 'tinybase/@types/_internal/store/with-schemas';
import { CellSchema, Value } from 'tinybase/with-schemas';

type collectionItemKeyEnum = keyof Required<Omit<CollectionItem, 'id'>>;
type historyKeyEnum = keyof Required<Omit<CollectionItemVersionRow, 'id'>>;
type historyContentKeyEnum = keyof Required<
  Omit<CollectionItemVersionContentRow, 'id'>
>;
type resumeStateKeyEnum = keyof Required<Omit<DocumentResumeStateRow, 'id'>>;
type statsKeyEnum = keyof Required<Omit<DocumentStatRow, 'id'>>;

export type SpaceType = [
  {
    collection: {
      [cellId in collectionItemKeyEnum]: CellSchema;
    };
    history: {
      [cellId in historyKeyEnum]: CellSchema;
    };
    history_content: {
      [cellId in historyContentKeyEnum]: CellSchema;
    };
    document_resume_state: {
      [cellId in resumeStateKeyEnum]: CellSchema;
    };
    stats: {
      [cellId in statsKeyEnum]: CellSchema;
    };
  },
  {
    lastUpdated: { type: 'number'; default: number };
    defaultSortBy: { type: 'string'; default: string };
    defaultSortDesc: { type: 'boolean'; default: false };
    historyIdleTime: { type: 'number'; default: number };
    historyMaxInterval: { type: 'number'; default: number };
    maxHistoryPerDoc: { type: 'number'; default: number };
    schemaVersion: { type: 'string'; default: string };
  }
];

export type SpaceValue = ValueIdFromSchema<SpaceType[1]>;

export type SpaceValues = { [key in SpaceValue]: Value<SpaceType[1], key> };

export const defaultOrder = 9999;
