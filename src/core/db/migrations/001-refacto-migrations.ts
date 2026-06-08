/* eslint-disable @typescript-eslint/no-explicit-any */
import { Id } from 'tinybase';
import { MetaField, NoSchemaStore } from '../types';

const C = 'collection';
const AN = 'document_annotation';
const H = 'history';
const S = 'stats';

export default function Migration(
  _space: NoSchemaStore,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _store: NoSchemaStore
) {
  metaFieldsBecomeObjects(_space);
  statsEnabledInItemFlags(_space);
  displayOptsBecomeObjects(_space);
  tagsBecomeArray(_space);
  snapshotJsonBecomeObjectsAndUpdate(_space);
  contentStatsBecomeObjects(_space);
}

function unstringify(space: NoSchemaStore, tableId: Id, cellId: Id) {
  space.getRowIds(tableId).forEach(rowId => {
    const cell = space.getCell(tableId, rowId, cellId);
    if (cell && typeof cell === 'string') {
      space.setCell(tableId, rowId, cellId, JSON.parse(cell));
    }
  });
}

function statsEnabledInItemFlags(_space: NoSchemaStore) {
  _space.getRowIds(C).forEach(rowId => {
    const display_opts = _space.getCell(C, rowId, 'display_opts');
    if (display_opts) {
      const oldDisplayOpts = JSON.parse(display_opts.toString()) as {
        statsEnabled?: boolean;
        sort: any;
        documentSort?: any;
      };
      if (oldDisplayOpts.statsEnabled !== undefined) {
        const statsEnabled = oldDisplayOpts.statsEnabled;
        delete oldDisplayOpts.statsEnabled;
        _space.setPartialRow(C, rowId, {
          display_opts: JSON.stringify(oldDisplayOpts),
          flags: { statsEnabled }
        });
      }
    }
  });
}

function metaFieldsBecomeObjects(space: NoSchemaStore) {
  _metaFieldsBecomeObjects(space, C);
  _metaFieldsBecomeObjects(space, AN);
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

function displayOptsBecomeObjects(space: NoSchemaStore) {
  unstringify(space, C, 'display_opts');
}

function tagsBecomeArray(space: NoSchemaStore) {
  space.getRowIds(C).forEach(rowId => {
    const tags = space.getCell(C, rowId, 'tags');
    if (tags && typeof tags === 'string') {
      space.setCell(C, rowId, 'tags', tags.split(','));
    }
  });
}

function snapshotJsonBecomeObjectsAndUpdate(space: NoSchemaStore) {
  space.getRowIds(H).forEach(rowId => {
    const snapshotJson = space.getCell(H, rowId, 'snapshotJson');
    if (snapshotJson && typeof snapshotJson === 'string') {
      const newJson = JSON.parse(snapshotJson);
      // TODO
      // statsEnabled to flags
      // metaFields to objects
      // display_opts to objects
      // tags to array
      space.setCell(H, rowId, 'snapshotJson', newJson);
    }
  });
}
function contentStatsBecomeObjects(space: NoSchemaStore) {
  unstringify(space, S, 'contentStatsJson');
}
