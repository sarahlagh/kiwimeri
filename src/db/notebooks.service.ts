import { getGlobalTrans } from '@/config';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { Notebook } from '@/notebooks/notebooks';
import storageService from './storage.service';
import { useCellWithRef, useTableWithRef } from './tinybase/hooks';

class NotebooksService {
  private readonly storeId = 'space';
  private readonly table = 'notebooks';
  private readonly spacesTable = 'spaces';

  public initNotebooks() {
    if (!this.hasOneNotebook()) {
      console.debug('[storage] no local notebooks detected, creating default');
      const id = notebooksService.addNotebook(
        getGlobalTrans().defaultNotebookName
      );
      if (id) {
        notebooksService.setCurrentNotebook(id);
      }
    }
  }

  public hasOneNotebook() {
    return storageService.getSpace().getRowCount(this.table) > 0;
  }

  public addNotebook(name: string, parent?: string) {
    return storageService.getSpace().addRow(this.table, {
      name,
      parent,
      created: Date.now()
    });
  }

  public deleteNotebook(id: string): void {
    storageService.getSpace().delRow(this.table, id);
  }

  public setCurrentNotebook(id: string) {
    storageService
      .getStore()
      .setCell(
        this.spacesTable,
        storageService.getSpaceId(),
        'currentNotebook',
        id
      );
  }

  public useCurrentNotebook() {
    return (
      useCellWithRef<string>(
        'store',
        this.spacesTable,
        storageService.getSpaceId(),
        'currentNotebook'
      ) || DEFAULT_NOTEBOOK_ID
    );
  }

  public useNotebookName(id: string) {
    return useCellWithRef<string>(this.storeId, this.table, id, 'name');
  }

  public setNotebookName(id: string, name: string) {
    storageService.getSpace().setCell(this.table, id, 'name', name);
  }

  public getNotebooks() {
    const table = storageService.getSpace().getTable(this.table);
    return Object.keys(table).map(id => ({ ...table[id], id }) as Notebook);
  }

  public useNotebooks() {
    const table = useTableWithRef(this.storeId, this.table);
    return Object.keys(table).map(id => ({ ...table[id], id }) as Notebook);
  }
}

const notebooksService = new NotebooksService();
export default notebooksService;
