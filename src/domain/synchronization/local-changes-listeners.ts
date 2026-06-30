import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { SpaceCellId, SpaceTableId } from '@/core/db/store-schema';
import { CollectionItemUpdatableFields } from '@/domain/collection/collection';
import { DocAnnotationUpdatableFields } from '@/domain/collection/doc-annotations';
import { UserPrefUpdatableFields } from '@/domain/user-preferences/user-preferences';
import { Id } from 'tinybase/with-schemas';
import { LocalChangeType } from './local-changes';
import localChangesService from './local-changes.service';

const listeners: Id[] = [];

const WAS_ADDED = 1;
const WAS_REMOVED = -1;

function watchTable<T extends SpaceTableId>(
  tableId: T,
  cellIds: SpaceCellId<T>[]
) {
  // add / delete listener
  listeners.push(
    space.addRowIdsListener(
      tableId,
      (_store, tableId, getIdChanges) => {
        if (getIdChanges) {
          const changes = getIdChanges();
          const rowIds = Object.keys(changes);
          rowIds.forEach(rowId => {
            if (changes[rowId] === WAS_ADDED) {
              localChangesService.addManualLocalChange(
                tableId,
                rowId,
                LocalChangeType.add
              );
            } else if (changes[rowId] === WAS_REMOVED) {
              localChangesService.addManualLocalChange(
                tableId,
                rowId,
                LocalChangeType.delete
              );
            }
          });
        }
      },
      true
    )
  );

  // update / conflict listener
  listeners.push(
    space.addRowListener(
      tableId,
      null,
      (_store, tableId, rowId, getCellChange) => {
        if (!_store.hasRow(tableId, rowId)) return; // skip row deletion
        if (getCellChange) {
          const [conflictCellChanged, oldCell, newCell] = getCellChange(
            tableId,
            rowId,
            'conflictId' as never
          );
          if (
            conflictCellChanged &&
            oldCell !== undefined &&
            newCell === undefined
          ) {
            localChangesService.addManualLocalChange(
              tableId,
              rowId,
              LocalChangeType.add
            );
            return;
          }
          for (const cellId of cellIds) {
            const [cellChanged] = getCellChange(
              tableId,
              rowId,
              cellId as never
            );
            if (cellChanged) {
              localChangesService.addManualLocalChange(
                tableId,
                rowId,
                LocalChangeType.update,
                cellId
              );
            }
          }
        }
      },
      true
    )
  );
}

export function startLocalChangesListeners() {
  watchTable(SpaceTables.Collection, CollectionItemUpdatableFields);
  watchTable(SpaceTables.Annotations, DocAnnotationUpdatableFields);
  watchTable(SpaceTables.UserPreference, UserPrefUpdatableFields);
}

export function stopLocalChangesListeners() {
  listeners.forEach(l => space.delListener(l));
  listeners.length = 0;
}
