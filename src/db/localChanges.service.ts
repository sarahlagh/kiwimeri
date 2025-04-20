import { Bucket } from '@/storage-providers/sync-core';
import storageService from './storage.service';
import { LocalChange, LocalChangeType } from './types/store-types';

class LocalChangesService {
  private readonly table = 'localChanges';
  private readonly queryPrefix = 'fetchLocalChanges';
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

  public addLocalChange(item: string, change: LocalChangeType, field?: string) {
    const space = storageService.getSpaceId();
    const localChange: LocalChange = {
      space,
      item,
      change,
      field,
      updated: Date.now()
    };

    if (change === LocalChangeType.update) {
      // if field update, merge with existing row if any
      const table = storageService.getStore().getTable(this.table);
      const queryName = this.fetchLocalChangesForItemQuery(space, item);
      const rowIds = storageService.getResultSortedRowIds(
        queryName,
        'updated',
        true
      );

      // if was added, don't count update
      let oldestRow;
      for (const rowId of rowIds) {
        const row = table[rowId];
        if (row.change === LocalChangeType.add) {
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
        return;
      }
    } else if (change === LocalChangeType.delete) {
      // if row deletion, but was added as part of local changes, remove any local changes associated
      const table = storageService.getStore().getTable(this.table);
      const queryName = this.fetchLocalChangesForItemQuery(space, item);
      const rowIds = storageService.getResultSortedRowIds(
        queryName,
        'updated',
        true
      );
      if (rowIds.length > 0) {
        let wasAdded = false;
        storageService.getStore().transaction(() => {
          for (const rowId of rowIds) {
            if (table[rowId].change === LocalChangeType.add) {
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
  }

  public getLocalChanges() {
    const space = storageService.getSpaceId();
    const table = storageService.getStore().getTable(this.table);
    const queryName = this.fetchAllLocalChangesQuery(space);
    const rowIds = storageService.getResultSortedRowIds(
      queryName,
      'updated',
      true
    );
    return rowIds.map(rowId => ({ ...table[rowId], id: rowId }) as LocalChange);
  }

  public clearLocalChanges() {
    const space = storageService.getSpaceId();
    const queryName = this.fetchAllLocalChangesQuery(space);

    // clear rows
    storageService.getStore().transaction(() => {
      storageService
        .getStoreQueries()
        .getResultRowIds(queryName)
        .forEach(rowId => {
          storageService.getStore().delRow(this.table, rowId);
        });
    });

    // clear queries
    const ids = storageService
      .getStoreQueries()
      .getQueryIds()
      .filter(queryId => queryId.startsWith(`${this.queryPrefix}For${space}`));
    for (const queryId of ids) {
      storageService.getStoreQueries().delQueryDefinition(queryId);
    }
  }

  public useLastLocalChange() {
    return (
      storageService.useCell<number>(
        'spaces',
        storageService.getSpaceId(),
        'lastLocalChange'
      ) || 0
    );
  }

  public setLastLocalChange(now: number) {
    storageService.setCell(
      'spaces',
      storageService.getSpaceId(),
      'lastLocalChange',
      now
    );
  }

  public setLocalBuckets(localBuckets: Bucket[]) {
    storageService.setCell(
      'spaces',
      storageService.getSpaceId(),
      'buckets',
      JSON.stringify(localBuckets)
    );
  }

  public getLocalBuckets() {
    const space = storageService.getSpaceId();
    return JSON.parse(
      storageService.getCell<string>('spaces', space, 'buckets')?.valueOf() ||
        '[]'
    );
  }
}

const localChangesService = new LocalChangesService();
export default localChangesService;
