import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { SpaceTableId } from '@/core/db/store-schema';
import { getPlainText } from '@/shared/utils/getPlainText';
import { Id } from 'tinybase/with-schemas';
import { statsOnPlainTextCallback } from '../stats/stats-on-change-callback';
import { DerivedPrefix, getDerivedId } from './model';

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

export function startDerivedContentListeners() {
  addDerivedContentListener(
    SpaceTables.Collection,
    'c',
    statsOnPlainTextCallback
  );
  addDerivedContentListener(SpaceTables.Annotations, 'a');
}

export function stopDerivedContentListeners() {
  listeners.forEach(l => space.delListener(l));
  listeners.length = 0;
}
