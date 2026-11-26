import { CollectionItemSettings } from '@/domain/collection/collection-settings';
import { SpaceTables } from '../store-constants';
import { NoSchemaStore } from './migrate';

const C = SpaceTables.Collection;
const P = SpaceTables.ProjectedState;

export default function Migration(_space: NoSchemaStore) {
  const collection = _space.getTable(C);
  const projected = _space.getTable(P);

  _space.transaction(() => {
    _space.getRowIds(P).forEach(rowId => {
      // backfill lastActivityAt
      if (
        collection[rowId].updatedAt &&
        projected[rowId].lastActivityAt === undefined
      ) {
        _space.setCell(P, rowId, 'lastActivityAt', collection[rowId].updatedAt);
      }

      // update sort values
      if (projected[rowId].settings) {
        const settings = projected[rowId].settings as CollectionItemSettings;
        if ((settings.sort?.by as string) === 'updatedAt') {
          settings.sort!.by = 'lastActivityAt';
          _space.setCell(C, rowId, 'settings', settings);
        }
      }

      // set nearestNotebookId
      if (
        projected[rowId].shortPath &&
        projected[rowId].nearestNotebookId === undefined
      ) {
        _space.setCell(
          P,
          rowId,
          'nearestNotebookId',
          (projected[rowId].shortPath as string[])[0]
        );
      }
    });
  });
}
