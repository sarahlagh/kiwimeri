import {
  CollectionItem,
  CollectionItemVersionContentRow,
  CollectionItemVersionRow
} from '@/collection/collection';
import { commentSchema } from '@/domain/comments/model';
import { resumeStateSchema } from '@/domain/resume-state/model';
import { DocumentStatRow } from '@/domain/stats/model';
import { ValueIdFromSchema } from 'tinybase/@types/_internal/store/with-schemas';
import { CellSchema, Value } from 'tinybase/with-schemas';

type collectionItemKeyEnum = keyof Required<Omit<CollectionItem, 'id'>>;
type historyKeyEnum = keyof Required<Omit<CollectionItemVersionRow, 'id'>>;
type historyContentKeyEnum = keyof Required<
  Omit<CollectionItemVersionContentRow, 'id'>
>;
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
    document_resume_state: typeof resumeStateSchema;
    stats: {
      [cellId in statsKeyEnum]: CellSchema;
    };
    comments: typeof commentSchema;
  },
  {
    valuesLastUpdatedAt: { type: 'number'; default: number };
    defaultSortBy: { type: 'string'; default: string };
    defaultSortDesc: { type: 'boolean'; default: false };
    historyIdleTime: { type: 'number'; default: number };
    historyMaxInterval: { type: 'number'; default: number };
    maxHistoryPerDoc: { type: 'number'; default: number };
    schemaVersion: { type: 'string'; default: string };
    statsEnabled: { type: 'boolean'; default: false };
  }
];

export type SpaceValue = ValueIdFromSchema<SpaceType[1]>;

export type SpaceValues = { [key in SpaceValue]: Value<SpaceType[1], key> };

export const defaultOrder = 9999;
