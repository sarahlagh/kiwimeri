import { DOC_PREVIEW_SIZE } from '@/constants';
import { space, spaceArchive } from '@/core/db/store';
import { SpaceArchiveTables, SpaceTables } from '@/core/db/store-constants';
import { SpaceCellId, SpaceTableId } from '@/core/db/store-schema';
import { getPlainText } from '@/shared/misc/getPlainText';
import { Id } from 'tinybase/with-schemas';
import { statsOnPlainTextCallback } from '../stats/stats-on-change-callback';
import { DerivedPrefix, getDerivedId } from './document-content';

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
          const previewText = plainText.substring(0, DOC_PREVIEW_SIZE);
          const derivedId = getDerivedId(l, rowId);
          _store.setRow(SpaceTables.DerivedPreview, derivedId, {
            previewText
          });
          spaceArchive.setRow(SpaceArchiveTables.DerivedContent, derivedId, {
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
              if (!_space.hasRow(SpaceTables.Collection, rowId)) return;
              const existingRank = _space.getCell(
                SpaceTables.DerivedState,
                rowId,
                rankColumn
              );

              if (idx !== existingRank) {
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
