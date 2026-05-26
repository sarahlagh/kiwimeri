import { unminimizeContentFromStorage } from '@/common/wysiwyg/compress-file-content';
import { space } from '@/core/db/store';
import { getPlainText } from '@/shared/utils/getPlainText';
import { Id } from 'tinybase/with-schemas';

const listeners: Id[] = [];

export function startCommentsListeners() {
  listeners.push(
    space.addCellListener(
      'comments',
      null,
      'content',
      (_store, tableId, rowId, cellId, newCell, oldCell) => {
        if (newCell && newCell !== oldCell) {
          const content = unminimizeContentFromStorage(newCell);
          _store.setCell(tableId, rowId, 'plainText', getPlainText(content));
        }
      },
      true
    )
  );
}

export function stopCommentsListeners() {
  listeners.forEach(l => space.delListener(l));
  listeners.length = 0;
}
