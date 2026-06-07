/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetaField, NoSchemaStore } from '../types';

const C = 'collection';
const AN = 'document_annotation';

export default function Migration(
  _space: NoSchemaStore,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _store: NoSchemaStore
) {
  metaFieldsBecomeObjects(_space);
  statsEnabledInItemFlags(_space);
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
