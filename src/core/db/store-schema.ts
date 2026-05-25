import { DEFAULT_NOTEBOOK_ID, DEFAULT_SPACE_ID } from '@/constants';
import { commentSchema } from '@/domain/comments/model';
import { localChangesSchema } from '@/domain/local-changes/model';
import { resumeStateSchema } from '@/domain/resume-state/model';
import { Value } from 'tinybase/with-schemas';
import {
  CellIdFromSchema,
  TableIdFromSchema,
  ValueIdFromSchema
} from './types';

export const storeTablesSchema = {
  spaces: {
    currentNotebook: {
      type: 'string',
      default: DEFAULT_NOTEBOOK_ID
    },
    currentFolder: {
      type: 'string',
      default: DEFAULT_NOTEBOOK_ID
    },
    currentDocument: { type: 'string' },
    currentPage: { type: 'string' }
  },
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
} as const;

export const storeValuesSchema = {
  theme: { type: 'string', default: 'dark' },
  showDevTools: { type: 'boolean', default: false },
  maxLogHistory: { type: 'number', default: 500 },
  internalProxy: { type: 'string' },
  currentSpace: { type: 'string', default: DEFAULT_SPACE_ID },
  exportIncludeMetadata: { type: 'boolean', default: true },
  exportInlinePages: { type: 'boolean', default: true },
  appVersion: { type: 'string' },
  tempDoc: { type: 'string' },
  defaultTimedDuration: { type: 'number', default: 10 },
  defaultTimedMode: { type: 'string', default: 'dangerous' },
  globalZoom: { type: 'number', default: 1 },
  rememberLastRoute: { type: 'boolean', default: true },
  resumeLastSelection: { type: 'boolean', default: true },
  lastBrowserMode: { type: 'number', default: 0 }
} as const;

export const spaceTablesSchema = {
  collection: {
    itemId: { type: 'string' },
    title: { type: 'string' },
    title_meta: { type: 'string' },
    parent: { type: 'string' },
    parent_meta: { type: 'string' },
    type: { type: 'string' },
    content: { type: 'string' },
    content_meta: { type: 'string' },
    tags: { type: 'string' },
    tags_meta: { type: 'string' },
    created: { type: 'number' },
    updated: { type: 'number' },
    deleted: { type: 'boolean', default: false },
    deleted_meta: { type: 'string' },
    conflict: { type: 'string' },
    order: { type: 'number' },
    order_meta: { type: 'string' },
    display_opts: { type: 'string' },
    display_opts_meta: { type: 'string' }
  },
  history: {
    itemId: { type: 'string' },
    op: { type: 'string' },
    createdAt: { type: 'number' },
    rank: { type: 'number' },
    snapshotJson: { type: 'string' },
    contentId: { type: 'string' },
    pageVersionsArrayJson: { type: 'string' }
  },
  history_content: {
    content: { type: 'string' },
    preview: { type: 'string' },
    hash: { type: 'number' }
  },
  document_resume_state: resumeStateSchema,
  stats: {
    itemId: { type: 'string' },
    date: { type: 'string' },
    contentStatsJson: { type: 'string' },
    lastOpenedAt: { type: 'number' }
  },
  comments: commentSchema
} as const;
export const spaceValuesSchema = {
  valuesLastUpdatedAt: { type: 'number', default: 0 },
  defaultSortBy: { type: 'string', default: 'created' },
  defaultSortDesc: { type: 'boolean', default: false },
  historyIdleTime: { type: 'number', default: 15000 },
  historyMaxInterval: { type: 'number', default: 300000 },
  maxHistoryPerDoc: { type: 'number', default: 50 },
  schemaVersion: { type: 'string', default: '' },
  statsEnabled: { type: 'boolean', default: false }
} as const;

// types

export type StoreTablesType = typeof storeTablesSchema;
export type StoreValuesType = typeof storeValuesSchema;
export type StoreType = [StoreTablesType, StoreValuesType];
export type StoreTableId = TableIdFromSchema<StoreTablesType>;
export type StoreValue = ValueIdFromSchema<StoreValuesType>;

export type SpaceTablesType = typeof spaceTablesSchema;
export type SpaceValuesType = typeof spaceValuesSchema;
export type SpaceType = [SpaceTablesType, SpaceValuesType];

export type SpaceTableId = TableIdFromSchema<SpaceTablesType>;
export type SpaceValue = ValueIdFromSchema<SpaceValuesType>;
export type SpaceValues = {
  [key in SpaceValue]: Value<SpaceValuesType, key>;
};

export type SpaceCellId<T extends SpaceTableId> = CellIdFromSchema<
  SpaceTablesType,
  T
>;

export type StoreId = 'store' | 'space';
