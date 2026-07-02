import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { SpaceCellId, SpaceTableId } from '@/core/db/store-schema';
import { getPlainText } from '@/shared/misc/getPlainText';
import { Id } from 'tinybase/with-schemas';
import { statsOnPlainTextCallback } from '../stats/stats-on-change-callback';
import { DerivedPrefix, getDerivedId } from './derived-content';

const listeners: Id[] = [];

function addDerivedContentListener(
  tableId: SpaceTableId,
  l: DerivedPrefix,
  onPlainTextChange?: (rowId: string, plainText: string) => void
) {
  listeners.push(
    space.addCellListener(
      tableId,
      null,
      'content',
      (_store, tableId, rowId, cellId, newCell, oldCell) => {
        if (newCell && newCell !== oldCell) {
          const plainText = getPlainText(newCell);
          _store.setRow(SpaceTables.DerivedContent, getDerivedId(l, rowId), {
            plainText
          });
          if (onPlainTextChange) onPlainTextChange(rowId, plainText);
        }
      },
      true
    )
  );
}

function addDerivedRankListeners<T extends SpaceTableId>(
  tableId: T,
  cellId: SpaceCellId<T>,
  rankColumn: SpaceCellId<SpaceTables.DerivedState>
) {
  listeners.push(
    space.addTableListener(
      tableId,
      _space => {
        _space.transaction(() => {
          _space
            .getSortedRowIds(tableId, cellId, false)
            .forEach((rowId, idx) => {
              if (
                idx !==
                _space.getCell(SpaceTables.DerivedState, rowId, rankColumn)
              ) {
                _space.setCell(
                  SpaceTables.DerivedState,
                  rowId,
                  rankColumn,
                  idx
                );
              }
            });
        });
      },
      true
    )
  );
}

function addDerivedStateListeners() {
  addDerivedRankListeners(SpaceTables.Collection, 'updatedAt', 'updatedAtRank');
  addDerivedRankListeners(
    SpaceTables.Stats,
    'lastOpenedAt',
    'lastOpenedAtRank'
  );
}

export function startDerivedTablesListeners() {
  addDerivedContentListener(
    SpaceTables.Collection,
    'c',
    statsOnPlainTextCallback
  );
  addDerivedContentListener(SpaceTables.Annotations, 'a');
  addDerivedStateListeners();
}

export function stopDerivedTablesListeners() {
  listeners.forEach(l => space.delListener(l));
  listeners.length = 0;
}
