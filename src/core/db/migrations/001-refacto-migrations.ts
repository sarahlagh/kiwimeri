/* eslint-disable @typescript-eslint/no-explicit-any */
import { unminimizeContentFromStorage } from '@/common/wysiwyg/compress-file-content';
import { getPlainText } from '@/shared/utils/getPlainText';
import { MetaField } from '../types';
import { NoSchemaStore } from './migrate';

enum _SpaceTables {
  Collection = 'collection',
  History = 'history',
  HistoryContent = 'history_content',
  ResumeState = 'collection_resume_state',
  Stats = 'stats',
  Annotations = 'document_annotation',
  UserPreference = 'user_preference',
  DerivedContent = 'derived_content'
}

const C = _SpaceTables.Collection;
const A = _SpaceTables.Annotations;
const H = _SpaceTables.History;
const S = _SpaceTables.Stats;
const UP = _SpaceTables.UserPreference;
const D = _SpaceTables.DerivedContent;

export default function Migration(
  _space: NoSchemaStore,
  _store: NoSchemaStore
) {
  metaFieldsBecomeObjects(_space);
  displayOptsBecomeSettings(_space);
  tagsBecomeArray(_space);
  snapshotJsonBecomeObjectsAndUpdate(_space);
  contentStatsBecomeObjects(_space);
  someValuesGoToUserPrefs(_space);
  documentResumeStateToCollectionResumeState(_space);
  storeValuesGoToSpace(_store, _space);
  addDerivedContent(_space); // TODO
}

function metaFieldsBecomeObjects(_space: NoSchemaStore) {
  _metaFieldsBecomeObjects(_space, C);
  _metaFieldsBecomeObjects(_space, A);
}

function _metaFieldsBecomeObjects(_space: NoSchemaStore, tableId: string) {
  _space.getRowIds(tableId).forEach(rowId => {
    const cellIds = _space.getCellIds(tableId, rowId);
    for (const cellId of cellIds) {
      if (cellId.endsWith('_meta')) {
        const metaField = _space.getCell(tableId, rowId, cellId);
        if (metaField && typeof metaField === 'string') {
          const oldMetaField = JSON.parse(metaField.toString()) as {
            u: number;
          };
          _space.setCell(tableId, rowId, cellId, {
            _u: oldMetaField.u
          } as MetaField);
        }
      }
    }
  });
}

function _transformOldDisplayOpts(type: string, display_opts_str: string) {
  const old_display_opts = JSON.parse(display_opts_str);
  if (type === 'n') {
    if (old_display_opts.documentSort !== undefined) {
      delete old_display_opts.documentSort;
    }
    if (old_display_opts.lastBrowserMode !== undefined) {
      old_display_opts.browserMode = old_display_opts.lastBrowserMode;
      delete old_display_opts.lastBrowserMode;
    }
  }
  if (type === 'f') {
    if (old_display_opts.documentSort !== undefined) {
      delete old_display_opts.documentSort;
    }
    if (old_display_opts.statsEnabled !== undefined) {
      delete old_display_opts.statsEnabled;
    }
  } else if (type === 'd') {
    if (old_display_opts.sort !== undefined) {
      delete old_display_opts.sort;
    }
    if (old_display_opts.statsEnabled !== undefined) {
      delete old_display_opts.statsEnabled;
    }
  }
  return old_display_opts;
}

function displayOptsBecomeSettings(_space: NoSchemaStore) {
  const tableId = C;
  const oldCellId = 'display_opts';
  _space.getRowIds(tableId).forEach(rowId => {
    const display_opts_str = _space.getCell(tableId, rowId, oldCellId);
    const type = _space.getCell(tableId, rowId, 'type');
    if (display_opts_str && typeof display_opts_str === 'string') {
      const transformed_display_opts = _transformOldDisplayOpts(
        type as string,
        display_opts_str
      );
      _space.setCell(tableId, rowId, 'settings', transformed_display_opts);
      const oldMeta = _space.getCell(tableId, rowId, 'display_opts_meta');
      if (oldMeta) _space.setCell(tableId, rowId, 'settings_meta', oldMeta);
    }
  });
}

function tagsBecomeArray(_space: NoSchemaStore) {
  _space.getRowIds(C).forEach(rowId => {
    const tags = _space.getCell(C, rowId, 'tags');
    if (tags !== undefined && typeof tags === 'string') {
      if (tags.length === 0) {
        _space.delCell(C, rowId, 'tags_meta');
      } else {
        _space.setCell(C, rowId, 'tags', tags.split(','));
      }
    }
  });
}

function historyMetaFieldsToObjects(snapshotJson: any) {
  Object.keys(snapshotJson).forEach(cellId => {
    if (cellId.endsWith('_meta')) {
      const metaField = snapshotJson[cellId];
      if (metaField && typeof metaField === 'string') {
        const oldMetaField = JSON.parse(metaField.toString()) as {
          u: number;
        };
        snapshotJson[cellId] = {
          _u: oldMetaField.u
        } as MetaField;
      }
    }
  });
}

function historyDisplayOptsToSettings(type: string, snapshotJson: any) {
  if (
    snapshotJson['display_opts'] !== undefined &&
    typeof snapshotJson['display_opts'] === 'string'
  ) {
    const transformed_display_opts = _transformOldDisplayOpts(
      type as string,
      snapshotJson['display_opts']
    );
    snapshotJson['settings'] = transformed_display_opts;
    delete snapshotJson['display_opts'];
  }
}

function historyTagsToArray(snapshotJson: any) {
  const tags = snapshotJson['tags'];
  if (tags !== undefined && typeof tags === 'string') {
    if (tags.length === 0) {
      delete snapshotJson['tags'];
      delete snapshotJson['tags_meta'];
    } else {
      snapshotJson['tags'] = tags.split(',');
    }
  }
}

function snapshotJsonBecomeObjectsAndUpdate(_space: NoSchemaStore) {
  _space.getRowIds(H).forEach(rowId => {
    const itemId = _space.getCell(H, rowId, 'itemId');
    if (itemId === undefined) return; // should delete instead
    const type = _space.getCell(C, itemId as string, 'type');
    if (type === undefined) return; // should delete instead
    const snapshotJson = _space.getCell(H, rowId, 'snapshotJson');
    if (snapshotJson && typeof snapshotJson === 'string') {
      const newJson = JSON.parse(snapshotJson);
      historyMetaFieldsToObjects(newJson);
      historyDisplayOptsToSettings(type as string, newJson);
      historyTagsToArray(newJson);
      delete newJson['deleted'];
      delete newJson['deleted_meta'];
      _space.setCell(H, rowId, 'snapshotJson', newJson);
    }
  });
}

function contentStatsBecomeObjects(_space: NoSchemaStore) {
  _space.getRowIds(S).forEach(rowId => {
    const cell = _space.getCell(S, rowId, 'contentStatsJson');
    if (cell && typeof cell === 'string') {
      _space.setCell(S, rowId, 'contentStatsJson', JSON.parse(cell));
    }
  });
}

function valueToUserPref(
  _space: NoSchemaStore,
  valueKey: string,
  updatedAt: number
) {
  if (_space.hasValue(valueKey)) {
    _space.setRow(UP, valueKey, {
      value: { _v: _space.getValue(valueKey) },
      updatedAt: updatedAt
    });
  }
}

function someValuesGoToUserPrefs(_space: NoSchemaStore) {
  let valuesLastUpdatedAt = Date.now();
  if (_space.hasValue('schemaVersion')) {
    _space.setValue('appVersion', _space.getValue('schemaVersion')!);
  }
  if (_space.hasValue('valuesLastUpdatedAt')) {
    valuesLastUpdatedAt = _space.getValue('valuesLastUpdatedAt') as number;
  }
  valueToUserPref(_space, 'defaultSortBy', valuesLastUpdatedAt);
  valueToUserPref(_space, 'defaultSortDesc', valuesLastUpdatedAt);
  valueToUserPref(_space, 'historyIdleTime', valuesLastUpdatedAt);
  valueToUserPref(_space, 'historyMaxInterval', valuesLastUpdatedAt);
  valueToUserPref(_space, 'maxHistoryPerDoc', valuesLastUpdatedAt);
  valueToUserPref(_space, 'statsEnabled', valuesLastUpdatedAt);
}

function renameTable(
  _space: NoSchemaStore,
  oldTable: string,
  newTable: string
) {
  if (!_space.hasTable(oldTable)) {
    return;
  }
  _space.getRowIds(oldTable).forEach(rowId => {
    const row = _space.getRow(oldTable, rowId);
    _space.setRow(newTable, rowId, row);
  });
}

function documentResumeStateToCollectionResumeState(_space: NoSchemaStore) {
  renameTable(_space, 'document_resume_state', 'collection_resume_state');
}

function _migrateValue(
  _store: NoSchemaStore,
  _space: NoSchemaStore,
  valueKey: string
) {
  const value = _store.getValue(valueKey);
  if (value !== undefined) _space.setValue(valueKey, value);
}

function storeValuesGoToSpace(_store: NoSchemaStore, _space: NoSchemaStore) {
  _migrateValue(_store, _space, 'globalZoom');
  _migrateValue(_store, _space, 'exportIncludeMetadata');
  _migrateValue(_store, _space, 'theme');
  _migrateValue(_store, _space, 'maxLogHistory');
  _migrateValue(_store, _space, 'internalProxy');
  _migrateValue(_store, _space, 'defaultTimedDuration');
  _migrateValue(_store, _space, 'defaultTimedMode');
  _migrateValue(_store, _space, 'rememberLastRoute');
  _migrateValue(_store, _space, 'resumeLastSelection');
}

function addDerivedContent(_space: NoSchemaStore) {
  _space.getRowIds(C).forEach(rowId => {
    const content = _space.getCell(C, rowId, 'content') as string;
    if (content) {
      _space.setRow(D, rowId, {
        on: C,
        plainText: getPlainText(unminimizeContentFromStorage(content))
      });
    }
  });
  _space.getRowIds(A).forEach(rowId => {
    const content = _space.getCell(A, rowId, 'content') as string;
    if (content) {
      _space.setRow(D, rowId, {
        on: A,
        plainText: getPlainText(unminimizeContentFromStorage(content))
      });
    }
  });
}
