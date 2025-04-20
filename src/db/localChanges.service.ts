import storageService from './storage.service';
import { LocalChange, LocalChangeType } from './types/store-types';

class LocalChangesService {
  private readonly table = 'localChanges';

  public addLocalChange(item: string, change: LocalChangeType, field?: string) {
    const localChange: LocalChange = {
      item,
      change,
      field,
      updated: Date.now()
    };

    if (change === LocalChangeType.update) {
      const table = storageService.getStore().getTable(this.table);
      const rowIds = storageService
        .getStore()
        .getSortedRowIds(this.table, 'updated', true);

      for (const rowId of rowIds) {
        const row = table[rowId];
        if (row.item === item && row.field === field) {
          storageService
            .getStore()
            .setCell(this.table, rowId, 'updated', localChange.updated);
          return;
        }
      }
    }

    storageService.getStore().addRow(this.table, localChange);
  }

  public clearTable() {
    storageService.getStore().delTable(this.table);
  }
}

const localChangesService = new LocalChangesService();
export default localChangesService;
