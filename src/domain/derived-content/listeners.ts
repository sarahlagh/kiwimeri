import { unminimizeContentFromStorage } from '@/common/wysiwyg/compress-file-content';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { SpaceTableId } from '@/core/db/store-schema';
import { getPlainText } from '@/shared/utils/getPlainText';
import { Id } from 'tinybase/with-schemas';

const listeners: Id[] = [];

function addDerivedContentListener(tableId: SpaceTableId) {
  listeners.push(
    space.addCellListener(
      tableId,
      null,
      'content',
      (_store, tableId, rowId, cellId, newCell, oldCell) => {
        if (newCell && newCell !== oldCell) {
          const content = unminimizeContentFromStorage(newCell);
          _store.setRow(SpaceTables.DerivedContent, rowId, {
            on: tableId,
            plainText: getPlainText(content)
          });
        }
      },
      true
    )
  );
}

export function startDerivedContentListeners() {
  addDerivedContentListener(SpaceTables.Collection);
  addDerivedContentListener(SpaceTables.Annotations);
}

export function stopDerivedContentListeners() {
  listeners.forEach(l => space.delListener(l));
  listeners.length = 0;
}
