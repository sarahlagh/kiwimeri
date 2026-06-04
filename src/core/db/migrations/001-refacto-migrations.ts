/* eslint-disable @typescript-eslint/no-explicit-any */
import { NoSchemas, Store } from 'tinybase/with-schemas';
import { StoreId } from '../store-schema';
import { MetaField } from '../types';

const C = 'collection';
const AN = 'document_annotation';

export default function Migration(space: Store<NoSchemas>, storeId: StoreId) {
  if (storeId === 'space') {
    metaFieldsBecomeObjects(space);
    statsEnabledInItemFlags(space);
  }
}

function statsEnabledInItemFlags(space: Store<NoSchemas>) {
  space.getRowIds(C).forEach(rowId => {
    const display_opts = space.getCell(C, rowId, 'display_opts');
    if (display_opts) {
      const oldDisplayOpts = JSON.parse(display_opts.toString()) as {
        statsEnabled?: boolean;
        sort: any;
        documentSort?: any;
      };
      if (oldDisplayOpts.statsEnabled !== undefined) {
        const statsEnabled = oldDisplayOpts.statsEnabled;
        delete oldDisplayOpts.statsEnabled;
        space.setPartialRow(C, rowId, {
          display_opts: JSON.stringify(oldDisplayOpts),
          flags: { statsEnabled }
        });
      }
    }
  });
}

function metaFieldsBecomeObjects(space: Store<NoSchemas>) {
  _metaFieldsBecomeObjects(space, C);
  _metaFieldsBecomeObjects(space, AN);
}

function _metaFieldsBecomeObjects(space: Store<NoSchemas>, tableId: string) {
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
