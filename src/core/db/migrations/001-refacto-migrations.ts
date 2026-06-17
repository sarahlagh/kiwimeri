/* eslint-disable @typescript-eslint/no-explicit-any */
import { SpaceTables } from '../store-schema';
import { MetaField, NoSchemaStore } from '../types';

const C = SpaceTables.Collection;
const A = SpaceTables.Annotations;
const H = SpaceTables.History;
const S = SpaceTables.Stats;
const UP = SpaceTables.UserPreference;

export default function Migration(
  _space: NoSchemaStore,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _store: NoSchemaStore
) {
  metaFieldsBecomeObjects(_space);
  displayOptsBecomeSettings(_space);
  tagsBecomeArray(_space);
  snapshotJsonBecomeObjectsAndUpdate(_space);
  contentStatsBecomeObjects(_space);
  someValuesGoToUserPrefs(_space);
}

function metaFieldsBecomeObjects(space: NoSchemaStore) {
  _metaFieldsBecomeObjects(space, C);
  _metaFieldsBecomeObjects(space, A);
}

function _metaFieldsBecomeObjects(space: NoSchemaStore, tableId: string) {
  space.getRowIds(tableId).forEach(rowId => {
    const cellIds = space.getCellIds(tableId, rowId);
    for (const cellId of cellIds) {
      if (cellId.endsWith('_meta')) {
        const metaField = space.getCell(tableId, rowId, cellId);
        if (metaField && typeof metaField === 'string') {
          const oldMetaField = JSON.parse(metaField.toString()) as {
            u: number;
          };
          space.setCell(tableId, rowId, cellId, {
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

function displayOptsBecomeSettings(space: NoSchemaStore) {
  const tableId = C;
  const oldCellId = 'display_opts';
  space.getRowIds(tableId).forEach(rowId => {
    const display_opts_str = space.getCell(tableId, rowId, oldCellId);
    const type = space.getCell(tableId, rowId, 'type');
    if (display_opts_str && typeof display_opts_str === 'string') {
      const transformed_display_opts = _transformOldDisplayOpts(
        type as string,
        display_opts_str
      );
      space.setCell(tableId, rowId, 'settings', transformed_display_opts);
      const oldMeta = space.getCell(tableId, rowId, 'display_opts_meta');
      if (oldMeta) space.setCell(tableId, rowId, 'settings_meta', oldMeta);
    }
  });
}

function tagsBecomeArray(space: NoSchemaStore) {
  space.getRowIds(C).forEach(rowId => {
    const tags = space.getCell(C, rowId, 'tags');
    if (tags !== undefined && typeof tags === 'string') {
      if (tags.length === 0) {
        space.delCell(C, rowId, 'tags_meta');
      } else {
        space.setCell(C, rowId, 'tags', tags.split(','));
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

function snapshotJsonBecomeObjectsAndUpdate(space: NoSchemaStore) {
  space.getRowIds(H).forEach(rowId => {
    const itemId = space.getCell(H, rowId, 'itemId');
    if (itemId === undefined) return; // should delete instead
    const type = space.getCell(C, itemId as string, 'type');
    if (type === undefined) return; // should delete instead
    const snapshotJson = space.getCell(H, rowId, 'snapshotJson');
    if (snapshotJson && typeof snapshotJson === 'string') {
      const newJson = JSON.parse(snapshotJson);
      historyMetaFieldsToObjects(newJson);
      historyDisplayOptsToSettings(type as string, newJson);
      historyTagsToArray(newJson);
      delete newJson['deleted'];
      delete newJson['deleted_meta'];
      space.setCell(H, rowId, 'snapshotJson', newJson);
    }
  });
}

function contentStatsBecomeObjects(space: NoSchemaStore) {
  space.getRowIds(S).forEach(rowId => {
    const cell = space.getCell(S, rowId, 'contentStatsJson');
    if (cell && typeof cell === 'string') {
      space.setCell(S, rowId, 'contentStatsJson', JSON.parse(cell));
    }
  });
}

function valueToUserPref(
  space: NoSchemaStore,
  valueKey: string,
  updatedAt: number
) {
  if (space.hasValue(valueKey)) {
    space.setRow(UP, valueKey, {
      value: { _v: space.getValue(valueKey) },
      updatedAt: updatedAt
    });
  }
}

function someValuesGoToUserPrefs(space: NoSchemaStore) {
  let valuesLastUpdatedAt = Date.now();
  if (space.hasValue('schemaVersion')) {
    space.setValue('appVersion', space.getValue('schemaVersion')!);
  }
  if (space.hasValue('valuesLastUpdatedAt')) {
    valuesLastUpdatedAt = space.getValue('valuesLastUpdatedAt') as number;
  }
  valueToUserPref(space, 'defaultSortBy', valuesLastUpdatedAt);
  valueToUserPref(space, 'defaultSortDesc', valuesLastUpdatedAt);
  valueToUserPref(space, 'historyIdleTime', valuesLastUpdatedAt);
  valueToUserPref(space, 'historyMaxInterval', valuesLastUpdatedAt);
  valueToUserPref(space, 'maxHistoryPerDoc', valuesLastUpdatedAt);
  valueToUserPref(space, 'statsEnabled', valuesLastUpdatedAt);
}
