import { CollectionItemSettings } from '@/domain/collection/collection-settings';
import { Store } from 'tinybase/with-schemas';
import { SpaceTables } from '../store-constants';
import { SpaceType } from '../store-schema';

const C = SpaceTables.Collection;
const ProjectedState = SpaceTables.ProjectedState;

export default function Migration(_space: Store<SpaceType>) {
  const table = _space.getTable(C);

  _space.transaction(() => {
    _space.getRowIds(C).forEach(rowId => {
      // backfill lastActivityAt
      if (
        table[rowId].updatedAt &&
        _space.getCell(ProjectedState, rowId, 'lastActivityAt') === undefined
      ) {
        _space.setCell(
          ProjectedState,
          rowId,
          'lastActivityAt',
          table[rowId].updatedAt
        );
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
