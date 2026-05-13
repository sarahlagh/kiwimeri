import { CollectionItemUpdatableFieldEnum } from '@/collection/collection';
import storageService from './storage.service';
import {
  useCellWithRef,
  useResultSortedRowIdsWithRef,
  useSliceRowIdsWithRef
} from './tinybase/hooks';
import { LocalChangeTypeV1, LocalChangeV1 } from './types/store-types';

// TODO if reset update back to default / last value, should reset local change too
class LocalChangesService {
  private readonly storeId = 'store';
  private readonly table = 'localChanges';
  private readonly queryPrefix = 'fetchLocalChanges';

  private reInitIndex() {
    if (
      !storageService
        .getStoreIndexes()
        .getIndexIds()
        .find(id => id === 'localChangesBySpace')
    ) {
      storageService
        .getStoreIndexes()
        .setIndexDefinition('localChangesBySpace', 'localChanges', 'space');
    }
  }

  private fetchAllLocalChangesQuery(space: string) {
    const queries = storageService.getStoreQueries();
    const queryName = `${this.queryPrefix}For${space}`;
    if (!queries.hasQuery(queryName)) {
      queries.setQueryDefinition(queryName, this.table, ({ select, where }) => {
        select('item');
        select('change');
        select('field');
        select('updated');
        where('space', space);
      });
    }
    return queryName;
  }

  private fetchLocalChangesForItemQuery(space: string, item: string) {
    const queries = storageService.getStoreQueries();
    const queryName = `${this.queryPrefix}For${space}ForItem${item}`;
    if (!queries.hasQuery(queryName)) {
      queries.setQueryDefinition(queryName, this.table, ({ select, where }) => {
        select('change');
        select('field');
        select('updated');
        where('space', space);
        where('item', item);
      });
    }
    return queryName;
  }

  public addLocalChange(
    item: string,
    change: LocalChangeTypeV1,
    field?: CollectionItemUpdatableFieldEnum
  ) {
    const space = storageService.getSpaceId();
    const localChange: LocalChangeV1 = {
      space,
      item,
      change,
      field,
      updated: Date.now()
    };

    if (
      change === LocalChangeTypeV1.update ||
      change === LocalChangeTypeV1.value
    ) {
      // if field update, merge with existing row if any
      const table = storageService.getStore().getTable(this.table);
      const queryName = this.fetchLocalChangesForItemQuery(space, item);
      const rowIds = storageService
        .getStoreQueries()
        .getResultSortedRowIds(queryName, 'updated', true, 0, undefined);

      // if was added, don't count update
      let oldestRow;
      for (const rowId of rowIds) {
        const row = table[rowId];
        if (row.change === LocalChangeTypeV1.add) {
          oldestRow = rowId;
          break;
        } else if (row.field === field) {
          oldestRow = rowId;
        }
      }
      if (oldestRow !== undefined) {
        storageService
          .getStore()
          .setCell(this.table, oldestRow, 'updated', localChange.updated);
        this.setLastLocalChange(localChange.updated);
        return;
      }
    } else if (change === LocalChangeTypeV1.delete) {
      // if row deletion, but was added as part of local changes, remove any local changes associated
      const table = storageService.getStore().getTable(this.table);
      const queryName = this.fetchLocalChangesForItemQuery(space, item);
      const rowIds = storageService
        .getStoreQueries()
        .getResultSortedRowIds(queryName, 'updated', true);
      if (rowIds.length > 0) {
        let wasAdded = false;
        storageService.getStore().transaction(() => {
          for (const rowId of rowIds) {
            if (table[rowId].change === LocalChangeTypeV1.add) {
              wasAdded = true;
            }
            storageService.getStore().delRow(this.table, rowId);
          }
        });
        if (wasAdded) {
          return;
        }
      }
    }

    storageService.getStore().addRow(this.table, localChange);
    this.setLastLocalChange(localChange.updated);
  }

  public getLocalChanges(
    offset?: number | undefined,
    limit?: number | undefined
  ) {
    const space = storageService.getSpaceId();
    const table = storageService.getStore().getTable(this.table);
    const queryName = this.fetchAllLocalChangesQuery(space);
    const rowIds = storageService
      .getStoreQueries()
      .getResultSortedRowIds(queryName, 'updated', true, offset, limit);
    return rowIds.map(
      rowId => ({ ...table[rowId], id: rowId }) as LocalChangeV1
    );
  }

  public useLocalChanges(
    offset?: number | undefined,
    limit?: number | undefined
  ) {
    const space = storageService.getSpaceId();
    const table = storageService.getStore().getTable(this.table);
    const queryName = this.fetchAllLocalChangesQuery(space);

    return useResultSortedRowIdsWithRef(
      this.storeId,
      queryName,
      'updated',
      true,
      offset,
      limit
    ).map(rowId => ({ ...table[rowId], id: rowId }) as LocalChangeV1);
  }

  public useHasLocalChanges() {
    this.reInitIndex();
    const space = storageService.getSpaceId();
    return (
      useSliceRowIdsWithRef(this.storeId, 'localChangesBySpace', space).length >
      0
    );
  }

  public delLocalChange(rowId: string) {
    storageService.getStore().delRow(this.table, rowId);
  }

  public clear() {
    const space = storageService.getSpaceId();
    const queryName = this.fetchAllLocalChangesQuery(space);

    // clear rows
    const rowIds = storageService.getStoreQueries().getResultRowIds(queryName);
    storageService.getStore().transaction(() => {
      rowIds.forEach(rowId => {
        storageService.getStore().delRow(this.table, rowId);
      });
    });
  }

  public useLastLocalChange() {
    return (
      useCellWithRef<number>(
        this.storeId,
        'spaces',
        storageService.getSpaceId(),
        'lastLocalChange'
      ) || 0
    );
  }

  public setLastLocalChange(now: number) {
    storageService
      .getStore()
      .setCell('spaces', storageService.getSpaceId(), 'lastLocalChange', now);
  }
}

const localChangesServiceV1 = new LocalChangesService();
export default localChangesServiceV1;
