import { CollectionItemSettings } from '@/domain/collection/collection-settings';
import { SpaceTables } from '../store-constants';
import { NoSchemaStore } from './migrate';

const C = SpaceTables.Collection;
const P = SpaceTables.ProjectedState;

export default function Migration(_space: NoSchemaStore) {
  const table = _space.getTable(C);

  _space.transaction(() => {
    _space.getRowIds(C).forEach(rowId => {
      // backfill lastActivityAt
      if (
        table[rowId].updatedAt &&
        _space.getCell(P, rowId, 'lastActivityAt') === undefined
      ) {
        _space.setCell(P, rowId, 'lastActivityAt', table[rowId].updatedAt);
      }

      // update sort values
      if (table[rowId].settings) {
        const settings = table[rowId].settings as CollectionItemSettings;
        if ((settings.sort?.by as string) === 'updatedAt') {
          settings.sort!.by = 'lastActivityAt';
          _space.setCell(C, rowId, 'settings', settings);
        }
      }
    });
  });
}
