import { getStore } from '@/core/db/store';
import { AsId, TableIdFromSchema } from '@/core/db/types';
import { SpaceType } from '@/db/types/space-types';
import { Id } from 'tinybase/with-schemas';
import { LocalChangeOn, LocalChangeRow, LocalChangeType } from './model';
import fetchLocalChangesQuery from './queries/fetchLocalChangesQuery';

const LC = 'localChanges';

class LocalChangesService {
  public addLocalChange(on: 'values'): void;
  public addLocalChange<T>(
    on: TableIdFromSchema<SpaceType[0]>,
    itemId: Id,
    change: LocalChangeType,
    field?: AsId<T>
  ): void;
  public addLocalChange<T>(
    on: LocalChangeOn,
    itemId?: Id,
    change?: LocalChangeType,
    field?: AsId<T>
  ) {
    const store = getStore();
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
        getStore().setCell(LC, addedRowId, 'createdAt', localChange.createdAt);
        return;
      }
      if (store.hasRow(LC, rowId)) {
        // already had update
        getStore().setCell(LC, rowId, 'createdAt', localChange.createdAt);
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
    }

    store.setRow(LC, rowId, localChange);
  }

  public getLocalChanges() {
    return fetchLocalChangesQuery.getResults({}, 'createdAt', true);
  }

  public delete(rowId: Id) {
    getStore().delRow(LC, rowId);
  }

  public clear() {
    getStore().delTable(LC);
  }

  private getLocalChangeId(
    localChange: Omit<LocalChangeRow<unknown>, 'createdAt'>
  ) {
    return `${localChange.on}-${localChange.itemId}-${localChange.change}-${localChange.field || ''}`;
  }
}

const localChangesService = new LocalChangesService();
export default localChangesService;
