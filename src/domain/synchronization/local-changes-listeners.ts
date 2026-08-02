import { space, spaceDocContent } from '@/core/db/store';
import { SpaceDocContentTables, SpaceTables } from '@/core/db/store-constants';
import {
  SpaceCellId,
  SpaceDocContentTableId,
  SpaceTableId
} from '@/core/db/store-schema';
import { CollectionItemUpdatableFields } from '@/domain/collection/collection';
import { DocAnnotationUpdatableFields } from '@/domain/collection/document-annotations';
import { UserPrefUpdatableFields } from '@/domain/user-preferences/user-preferences';
import { Id } from 'tinybase/with-schemas';
import { LocalChangeType } from './local-changes';
import localChangesService from './local-changes.service';

const listeners: Id[] = [];
const contentListeners: Id[] = [];

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
                LocalChangeType.add,
                rowId,
                _store.getRow(tableId, rowId)
              );
            } else if (changes[rowId] === WAS_REMOVED) {
              localChangesService.addManualLocalChange(
                tableId,
                LocalChangeType.delete,
                rowId,
                ''
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
          const [conflictCellChanged, oldConflictCell, newConflictCell] =
            getCellChange(tableId, rowId, 'conflictId' as never);
          if (
            conflictCellChanged &&
            oldConflictCell !== undefined &&
            newConflictCell === undefined
          ) {
            localChangesService.addManualLocalChange(
              tableId,
              LocalChangeType.add,
              rowId,
              _store.getRow(tableId, rowId)
            );
            return;
          }
          for (const cellId of cellIds) {
            const [cellChanged, oldCell, newCell] = getCellChange(
              tableId,
              rowId,
              cellId as never
            );
            if (cellChanged) {
              localChangesService.addManualLocalChange(
                tableId,
                LocalChangeType.update,
                rowId,
                newCell,
                {
                  field: cellId,
                  previousData: oldCell
                }
              );
            }
          }
        }
      },
      true
    )
  );
}

function watchContentTable(
  tableId: SpaceDocContentTableId,
  onSpaceTable: SpaceTableId
) {
  // update / conflict listener
  contentListeners.push(
    spaceDocContent.addCellListener(
      tableId,
      null,
      'content',
      (_store, tableId, rowId, cellId, newCell, oldCell, getCellChange) => {
        if (getCellChange && newCell && oldCell && newCell !== oldCell) {
          if (getCellChange) {
            const [conflictCellChanged, oldConflictCell, newConflictCell] =
              getCellChange(tableId, rowId, 'conflictId' as never);
            if (
              conflictCellChanged &&
              oldConflictCell !== undefined &&
              newConflictCell === undefined
            ) {
              localChangesService.addManualLocalChange(
                onSpaceTable,
                LocalChangeType.add,
                rowId,
                _store.getRow(tableId, rowId)
              );
              return;
            }
            const [cellChanged, oldCell, newCell] = getCellChange(
              tableId,
              rowId,
              'content'
            );
            if (cellChanged) {
              localChangesService.addManualLocalChange(
                onSpaceTable,
                LocalChangeType.update,
                rowId,
                newCell,
                {
                  field: cellId,
                  previousData: oldCell
                }
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
  watchTable(
    SpaceTables.Collection,
    CollectionItemUpdatableFields.filter(f => f !== 'content')
  );
  watchContentTable(
    SpaceDocContentTables.CollectionContent,
    SpaceTables.Collection
  );
  watchTable(
    SpaceTables.Annotations,
    DocAnnotationUpdatableFields.filter(f => f !== 'content')
  );
  watchContentTable(
    SpaceDocContentTables.AnnotationContent,
    SpaceTables.Annotations
  );
  watchTable(SpaceTables.UserPreference, UserPrefUpdatableFields);
}

export function stopLocalChangesListeners() {
  listeners.forEach(l => {
    space.delListener(l);
  });
  contentListeners.forEach(l => {
    spaceDocContent.delListener(l);
  });
  listeners.length = 0;
}
