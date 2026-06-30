import { collectionSchema } from '@/domain/collection/collection';
import { derivedContentSchema } from '@/domain/collection/derived-content';
import { derivedItemStateSchema } from '@/domain/collection/derived-item-state';
import { docAnnotationSchema } from '@/domain/collection/doc-annotations';
import { resumeStateSchema } from '@/domain/collection/resume-state';
import { historyContentSchema, historySchema } from '@/domain/history/history';
import { statsSchema } from '@/domain/stats/stats';
import { localChangesSchema } from '@/domain/synchronization/local-changes';
import { remotesSchema } from '@/domain/synchronization/remotes';
import { replicaStatesSchema } from '@/domain/synchronization/replica-state';
import { userPreferenceSchema } from '@/domain/user-preferences/user-preferences';
import { SpaceTables, StoreTables } from './store-constants';
import {
  CellIdFromSchema,
  DefaultedValueFromSchema,
  TableIdFromSchema,
  ValueIdFromSchema
} from './types';

export const storeTablesSchema = {
  logs: {
    ts: { type: 'number' },
    level: { type: 'string' },
    message: { type: 'string' }
  }
} as const satisfies Record<StoreTables, unknown>;

export const spaceTablesSchema = {
  collection: collectionSchema,
  history: historySchema,
  history_content: historyContentSchema,
  collection_resume_state: resumeStateSchema,
  stats: statsSchema,
  document_annotation: docAnnotationSchema,
  user_preference: userPreferenceSchema,
  derived_content: derivedContentSchema,
  derived_item_state: derivedItemStateSchema,
  local_change: localChangesSchema,
  remote: remotesSchema,
  replica_state: replicaStatesSchema
} as const satisfies Record<SpaceTables, unknown>;

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
