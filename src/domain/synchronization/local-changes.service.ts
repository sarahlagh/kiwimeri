import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { AsId, DbSerializableData } from '@/core/db/types';
import { getHash } from 'tinybase';
import { Id } from 'tinybase/with-schemas';
import {
  LocalChangeOn,
  LocalChangeResult,
  LocalChangeRow,
  LocalChangeType
} from './local-changes';

const LC = SpaceTables.LocalChanges;

class LocalChangesService {
  public addManualLocalChange<T>(
    on: LocalChangeOn,
    change: LocalChangeType,
    itemId: Id,
    newData: DbSerializableData | undefined,
    props?: {
      field: AsId<T>;
      previousData: DbSerializableData | undefined;
    }
  ) {
    const newDataHash = getHash(JSON.stringify(newData));
    const previousDataHash = props
      ? getHash(JSON.stringify(props.previousData))
      : 0;
    const localChange: LocalChangeRow<T> = {
      itemId,
      change: change || LocalChangeType.update,
      field: props?.field,
      on,
      createdAt: Date.now(),
      previousHash: previousDataHash,
      previousData: props?.previousData ? { _v: props.previousData } : undefined
    };
    const rowId = this.getLocalChangeId(localChange);
    const addedRowId = this.getLocalChangeId({
      itemId,
      change: LocalChangeType.add,
      on
    });
    if (change === LocalChangeType.update) {
      if (space.hasRow(LC, addedRowId)) {
        // was added in same session
        space.setCell(LC, addedRowId, 'createdAt', localChange.createdAt);
        return;
      }
      if (space.hasRow(LC, rowId)) {
        // already had update
        const lastPreviousHash = space.getCell(LC, rowId, 'previousHash');
        if (newDataHash === lastPreviousHash) {
          // should cancel self
          space.delRow(LC, rowId);
          return;
        }
        space.setCell(LC, rowId, 'createdAt', localChange.createdAt);
        return;
      }
    } else if (change === LocalChangeType.delete) {
      if (space.hasRow(LC, addedRowId)) {
        // was added in same session
        space.delRow(LC, addedRowId);
        return;
      }
      const updatedRowIdPrefix = this.getLocalChangeId({
        itemId,
        change: LocalChangeType.update,
        on
      });
      const updates = space
        .getRowIds(LC)
        .filter(id => id.startsWith(updatedRowIdPrefix));
      space.transaction(() => {
        updates.forEach(u => {
          space.delRow(LC, u);
        });
      });
    } else if (change === LocalChangeType.add) {
      const deletedRowId = this.getLocalChangeId({
        itemId,
        change: LocalChangeType.delete,
        on
      });
      if (space.hasRow(LC, deletedRowId)) {
        // was restored
        space.delRow(LC, deletedRowId);

        // no way to know if item was updated before restore
        localChange.change = LocalChangeType.update;
      }
    }
    if (previousDataHash !== newDataHash) {
      space.setRow(LC, rowId, localChange);
    }
  }

  public getLocalChanges() {
    const results: LocalChangeResult[] = [];
    const table = space.getTable(LC);
    space.getSortedRowIds(LC, 'createdAt', true).forEach(rowId => {
      const row = table[rowId] as LocalChangeRow<never>;
      results.push({ ...row, id: rowId });
    });
    return results;
  }

  public delete(rowId: Id) {
    space.delRow(LC, rowId);
  }

  public clear() {
    space.delTable(LC);
  }

  private getLocalChangeId(
    localChange: Pick<
      LocalChangeRow<unknown>,
      'on' | 'itemId' | 'change' | 'field'
    >
  ) {
    return `${localChange.on}-${localChange.itemId}-${localChange.change}-${localChange.field || ''}`;
  }
}

const localChangesService = new LocalChangesService();
export default localChangesService;
