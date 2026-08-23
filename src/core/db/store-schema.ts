import { collectionSchema } from '@/domain/collection/collection';
import {
  annotationsViewSchema,
  collectionItemViewSchema,
  projectedItemStateSchema
} from '@/domain/collection/derived-item-state';
import { docAnnotationSchema } from '@/domain/collection/document-annotations';
import { contentSchema } from '@/domain/collection/document-content';
import { resumeStateSchema } from '@/domain/collection/resume-state';
import { documentEditsSchema } from '@/domain/document_fast_write/document-edits';
import { historyContentSchema, historySchema } from '@/domain/history/history';
import { statsSchema } from '@/domain/stats/stats';
import { localChangesSchema } from '@/domain/synchronization/local-changes';
import { remotesSchema } from '@/domain/synchronization/remotes';
import { replicaStatesSchema } from '@/domain/synchronization/replica-state';
import { userPreferenceSchema } from '@/domain/user-preferences/user-preferences';
import { NoValuesSchema } from 'tinybase/with-schemas';
import { logsSchema } from '../logs/logs';
import { tasksSchema } from '../tasks/tasks';
import {
  SpaceArchiveTables,
  SpaceDocContentTables,
  SpaceTables,
  StoreTables
} from './store-constants';
import {
  CellIdFromSchema,
  DefaultedValueFromSchema,
  TableIdFromSchema,
  ValueIdFromSchema
} from './types';

export const storeTablesSchema = {
  profiles: {
    createdAt: { type: 'number' }
  },
  logs: logsSchema
} as const satisfies Record<StoreTables, unknown>;

export const spaceTablesSchema = {
  collection: collectionSchema,
  collection_resume_state: resumeStateSchema,
  stats: statsSchema,
  document_annotation: docAnnotationSchema,
  user_preference: userPreferenceSchema,
  collection_projected_state: projectedItemStateSchema,
  collection_item_view: collectionItemViewSchema,
  document_annotation_view: annotationsViewSchema,
  local_change: localChangesSchema,
  remote: remotesSchema,
  replica_state: replicaStatesSchema,
  tasks: tasksSchema,
  document_edits: documentEditsSchema
} as const satisfies Record<SpaceTables, unknown>;

export const spaceDocContentTablesSchema = {
  collection_content: contentSchema,
  document_annotation_content: contentSchema
} as const satisfies Record<SpaceDocContentTables, unknown>;

export const spaceArchiveTablesSchema = {
  history: historySchema,
  history_content: historyContentSchema
} as const satisfies Record<SpaceArchiveTables, unknown>;

export const storeValuesSchema = {
  tempDoc: { type: 'string' }
} as const;

export const spaceValuesSchema = {
  appVersion: { type: 'string', default: '' },
  currentNotebook: { type: 'string' },
  showDevTools: { type: 'boolean', default: false },
  globalZoom: { type: 'number', default: 1 },
  exportIncludeMetadata: { type: 'boolean', default: true },
  theme: { type: 'string', default: 'dark' },
  maxLogHistory: { type: 'number', default: 500 },
  internalProxy: { type: 'string' },
  defaultTimedDuration: { type: 'number', default: 10 },
  defaultTimedMode: { type: 'string', default: 'dangerous' },
  rememberLastRoute: { type: 'boolean', default: true },
  resumeLastSelection: { type: 'boolean', default: true }
} as const;

// types

export type StoreTablesType = typeof storeTablesSchema;
export type StoreValuesType = typeof storeValuesSchema;
export type StoreType = [StoreTablesType, StoreValuesType];
export type StoreTableId = TableIdFromSchema<StoreTablesType>;
export type StoreValue = ValueIdFromSchema<StoreValuesType>;
export type StoreValueType<ValueId extends StoreValue> =
  DefaultedValueFromSchema<StoreValuesType, ValueId>;

export type SpaceTablesType = typeof spaceTablesSchema;
export type SpaceValuesType = typeof spaceValuesSchema;
export type SpaceType = [SpaceTablesType, SpaceValuesType];

export type SpaceTableId = TableIdFromSchema<SpaceTablesType>;
export type SpaceValue = ValueIdFromSchema<SpaceValuesType>;

export type SpaceValueType<ValueId extends SpaceValue> =
  DefaultedValueFromSchema<SpaceValuesType, ValueId>;
export type SpaceValues = {
  [key in SpaceValue]: SpaceValueType<key>;
};
export type SpaceCellId<T extends SpaceTableId> = CellIdFromSchema<
  SpaceTablesType,
  T
>;

export type SpaceDocContentTablesType = typeof spaceDocContentTablesSchema;
export type SpaceDocContentType = [SpaceDocContentTablesType, NoValuesSchema];
export type SpaceDocContentTableId =
  TableIdFromSchema<SpaceDocContentTablesType>;

export type SpaceArchiveTablesType = typeof spaceArchiveTablesSchema;
export type SpaceArchiveType = [SpaceArchiveTablesType, NoValuesSchema];
export type SpaceArchiveTableId = TableIdFromSchema<SpaceArchiveTablesType>;
