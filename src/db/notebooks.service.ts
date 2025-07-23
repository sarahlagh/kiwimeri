import { CollectionItemType, setFieldMeta } from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import { DEFAULT_NOTEBOOK_ID, ROOT_NOTEBOOK } from '@/constants';
import { Notebook, NotebookResult } from '@/notebooks/notebooks';
import { getUniqueId } from 'tinybase/with-schemas';
import collectionService from './collection.service';
import localChangesService from './localChanges.service';
import storageService from './storage.service';
import {
  useCellWithRef,
  useResultSortedRowIdsWithRef,
  useTableWithRef
} from './tinybase/hooks';
import { LocalChangeType } from './types/store-types';

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
    const now = Date.now();
    const id = storageService.getSpace().addRow(this.table, {
      title,
      title_meta: setFieldMeta(title, now),
      parent: parent ? parent : ROOT_NOTEBOOK,
      parent_meta: setFieldMeta(parent ? parent : ROOT_NOTEBOOK, now),
      created: Date.now(),
      updated: Date.now(),
      type: CollectionItemType.notebook
    });
    if (id) {
      localChangesService.addLocalChange(id, LocalChangeType.add);
    }
    return id;
  }

  public getNewNotebookObj(title: string, parent?: string) {
    const now = Date.now();
    const id = getUniqueId();
    const item: Notebook = {
      title,
      title_meta: setFieldMeta(title, now),
      parent: parent ? parent : ROOT_NOTEBOOK,
      parent_meta: setFieldMeta(parent ? parent : ROOT_NOTEBOOK, now),
      created: Date.now(),
      updated: Date.now(),
      type: CollectionItemType.notebook,
      deleted: false,
      deleted_meta: setFieldMeta('false', now)
    };
    return {
      id,
      item
    };
  }

  public deleteNotebook(id: string): void {
    // if items inside, delete them
    const items = collectionService.getAllCollectionItems(id);
    if (items.length > 0) {
      storageService.getSpace().transaction(() => {
        items.forEach(i => collectionService.deleteItem(i.id));
      });
    }
    storageService.getSpace().delRow(this.table, id);
    localChangesService.addLocalChange(id, LocalChangeType.delete);
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

    // storageService.getStore().transaction(() => {
    //   storageService
    //     .getStore()
    //     .setCell(
    //       this.spacesTable,
    //       storageService.getSpaceId(),
    //       'currentNotebook',
    //       id
    //     );
    //   storageService
    //     .getStore()
    //     .setCell(
    //       this.spacesTable,
    //       storageService.getSpaceId(),
    //       'currentFolder',
    //       id
    //     );
    // });
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
    collectionService.setItemTitle(id, title);
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
