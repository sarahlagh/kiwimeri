import storageService from './storage.service';

class NotebooksService {
  private readonly storeId = 'space';
  private readonly table = 'notebooks';
  private readonly spacesTable = 'spaces';

  public initNotebooks() {
    if (!this.hasOneNotebook()) {
      console.debug('[storage] no local notebooks detected, creating default');
      const id = notebooksService.addNotebook('default');
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
}

const notebooksService = new NotebooksService();
export default notebooksService;
