import { collectionSchema } from '@/domain/collection/model';
import { derivedContentSchema } from '@/domain/derived-content/model';
import { derivedItemStateSchema } from '@/domain/derived-item-state/model';
import { docAnnotationSchema } from '@/domain/document-annotations/model';
import { localChangesSchema } from '@/domain/local-changes/model';
import { remotesSchema } from '@/domain/remotes/configuration/model';
import { replicaStatesSchema } from '@/domain/replication/replica-state/model';
import { resumeStateSchema } from '@/domain/resume-state/model';
import { userPreferenceSchema } from '@/domain/user-preferences/model';
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
  history: {
    itemId: { type: 'string' },
    op: { type: 'string' },
    createdAt: { type: 'number' },
    rank: { type: 'number' },
    snapshotJson: { type: 'object' },
    contentId: { type: 'string' }
  },
  history_content: {
    content: { type: 'string' },
    preview: { type: 'string' },
    hash: { type: 'number' }
  },
  collection_resume_state: resumeStateSchema,
  stats: {
    itemId: { type: 'string' },
    date: { type: 'string' },
    contentStatsJson: { type: 'object' },
    lastOpenedAt: { type: 'number' }
  },
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
