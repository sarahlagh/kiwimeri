import { CollectionItemType } from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import { DEFAULT_NOTEBOOK_ID, ROOT_NOTEBOOK } from '@/constants';
import { NotebookResult } from '@/notebooks/notebooks';
import storageService from './storage.service';
import {
  useCellWithRef,
  useResultSortedRowIdsWithRef,
  useTableWithRef
} from './tinybase/hooks';

class NotebooksService {
  private readonly storeId = 'space';
  private readonly table = 'collection';
  private readonly spacesTable = 'spaces';

  private fetchAllNotebooksQuery(parent?: string, deleted: boolean = false) {
    const queries = storageService.getSpaceQueries();
    const queryName = `fetchAllNotebooksFor${parent ? parent : ROOT_NOTEBOOK}`;
    if (!queries.hasQuery(queryName)) {
      queries.setQueryDefinition(queryName, this.table, ({ select, where }) => {
        select('title');
        select('created');
        where('type', CollectionItemType.notebook);
        where('parent', parent ? parent : ROOT_NOTEBOOK);
        where('deleted', deleted);
      });
    }
    return queryName;
  }

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
    return this.getNotebooks().length > 0;
  }

  public addNotebook(title: string, parent?: string) {
    return storageService.getSpace().addRow(this.table, {
      title,
      parent: parent ? parent : ROOT_NOTEBOOK,
      created: Date.now(),
      type: CollectionItemType.notebook
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

  public getCurrentNotebook() {
    return (
      (storageService
        .getStore()
        .getCell(
          this.spacesTable,
          storageService.getSpaceId(),
          'currentNotebook'
        )
        ?.valueOf() as string) || ''
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

  public useNotebookTitle(id: string) {
    return useCellWithRef<string>(this.storeId, this.table, id, 'title');
  }

  public setNotebookTitle(id: string, title: string) {
    storageService.getSpace().setCell(this.table, id, 'title', title);
  }

  public getNotebooks(
    parent?: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ) {
    const table = storageService.getSpace().getTable(this.table);
    const queryName = this.fetchAllNotebooksQuery(parent);
    return storageService
      .getSpaceQueries()
      .getResultSortedRowIds(queryName, sortBy, descending)
      .map(rowId => {
        const row = table[rowId];
        return { ...row, id: rowId } as NotebookResult;
      });
  }

  public useNotebooks(
    parent?: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ) {
    const table = useTableWithRef(this.storeId, this.table);
    const queryName = this.fetchAllNotebooksQuery(parent);
    return useResultSortedRowIdsWithRef(
      this.storeId,
      queryName,
      sortBy,
      descending
    ).map(rowId => {
      const row = table[rowId];
      return { ...row, id: rowId } as NotebookResult;
    });
  }
}

const notebooksService = new NotebooksService();
export default notebooksService;
