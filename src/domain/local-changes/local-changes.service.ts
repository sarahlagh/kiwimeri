import { store } from '@/core/db/store';
import { StoreTables } from '@/core/db/store-schema';
import { AsId } from '@/core/db/types';
import { Id } from 'tinybase/with-schemas';
import {
  LocalChangeOn,
  LocalChangeResult,
  LocalChangeRow,
  LocalChangeType
} from './model';

const LC = StoreTables.LC;

class LocalChangesService {
  public addManualLocalChange<T>(
    on: LocalChangeOn,
    itemId?: Id,
    change?: LocalChangeType,
    field?: AsId<T>
  ) {
    const localChange: LocalChangeRow<T> = {
      itemId: itemId || '',
      change: change || LocalChangeType.update,
      field,
      on,
      createdAt: Date.now()
    };
    const rowId = this.getLocalChangeId(localChange);
    const addedRowId = this.getLocalChangeId({
      itemId: itemId || '',
      change: LocalChangeType.add,
      on
    });
    if (change === LocalChangeType.update) {
      if (store.hasRow(LC, addedRowId)) {
        // was added in same session
        store.setCell(LC, addedRowId, 'createdAt', localChange.createdAt);
        return;
      }
      if (store.hasRow(LC, rowId)) {
        // already had update
        store.setCell(LC, rowId, 'createdAt', localChange.createdAt);
        return;
      }
    } else if (change === LocalChangeType.delete) {
      if (store.hasRow(LC, addedRowId)) {
        // was added in same session
        store.delRow(LC, addedRowId);
        return;
      }
      const updatedRowIdPrefix = this.getLocalChangeId({
        itemId: itemId || '',
        change: LocalChangeType.update,
        on
      });
      const updates = store
        .getRowIds(LC)
        .filter(id => id.startsWith(updatedRowIdPrefix));
      store.transaction(() => {
        updates.forEach(u => {
          store.delRow(LC, u);
        });
      });
    } else if (change === LocalChangeType.add) {
      const deletedRowId = this.getLocalChangeId({
        itemId: itemId || '',
        change: LocalChangeType.delete,
        on
      });
      if (store.hasRow(LC, deletedRowId)) {
        // was restored
        store.delRow(LC, deletedRowId);

        // no way to know if item was updated before restore
        localChange.change = LocalChangeType.update;
      }
    }
    store.setRow(LC, rowId, localChange);
  }

  public getLocalChanges() {
    const results: LocalChangeResult[] = [];
    const table = store.getTable(LC);
    store.getSortedRowIds(LC, 'createdAt', true).forEach(rowId => {
      const row = table[rowId] as LocalChangeRow<never>;
      results.push({ ...row, id: rowId });
    });
    return results;
  }

  public delete(rowId: Id) {
    store.delRow(LC, rowId);
  }

  public clear() {
    store.delTable(LC);
  }

  private getLocalChangeId(
    localChange: Omit<LocalChangeRow<unknown>, 'createdAt'>
  ) {
    return `${localChange.on}-${localChange.itemId}-${localChange.change}-${localChange.field || ''}`;
  }
}

const localChangesService = new LocalChangesService();
export default localChangesService;
