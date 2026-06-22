import { docAnnotationSchema } from '@/domain/document-annotations/model';
import { localChangesSchema } from '@/domain/local-changes/model';
import { resumeStateSchema } from '@/domain/resume-state/model';
import { userPreferenceSchema } from '@/domain/user-preferences/model';
import { Value } from 'tinybase/with-schemas';
import { SpaceTables, StoreTables } from './store-constants';
import {
  CellIdFromSchema,
  DefaultedValueFromSchema,
  metaSchemaDefault,
  TableIdFromSchema,
  ValueIdFromSchema
} from './types';

export const storeTablesSchema = {
  localChanges: localChangesSchema,
  remotes: {
    state: { type: 'string' },
    name: { type: 'string' },
    rank: { type: 'number' },
    type: { type: 'string' },
    config: { type: 'string' }
  },
  remoteState: {
    connected: { type: 'boolean' },
    lastRemoteChange: { type: 'number' },
    lastPulled: { type: 'number' },
    info: { type: 'string' }
  },
  logs: {
    ts: { type: 'number' },
    level: { type: 'string' },
    message: { type: 'string' }
  },
  search: {
    // rowId = itemId
    breadcrumb: { type: 'string' },
    contentPreview: { type: 'string' }
  },
  ancestors: {
    parentId: { type: 'string' },
    childId: { type: 'string' },
    depth: { type: 'number', default: 0 }
  }
} as const satisfies Record<StoreTables, unknown>;

export const storeValuesSchema = {
  tempDoc: { type: 'string' }
} as const;

export const spaceTablesSchema = {
  collection: {
    itemId: { type: 'string' },
    title: { type: 'string' },
    title_meta: { type: 'object', default: metaSchemaDefault },
    parent: { type: 'string' },
    parent_meta: { type: 'object', default: metaSchemaDefault },
    type: { type: 'string' },
    content: { type: 'string' },
    content_meta: { type: 'object' },
    tags: { type: 'array' },
    tags_meta: { type: 'object' },
    created: { type: 'number' },
    updated: { type: 'number' },
    conflict: { type: 'string' },
    order: { type: 'number' },
    order_meta: { type: 'object' },
    settings: { type: 'object' },
    settings_meta: { type: 'object' }
  },
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
  user_preference: userPreferenceSchema
} as const satisfies Record<SpaceTables, unknown>;

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
export type SpaceValues = {
  [key in SpaceValue]: Value<SpaceValuesType, key>;
};
export type SpaceValueType<ValueId extends SpaceValue> =
  DefaultedValueFromSchema<SpaceValuesType, ValueId>;

export type SpaceCellId<T extends SpaceTableId> = CellIdFromSchema<
  SpaceTablesType,
  T
>;
