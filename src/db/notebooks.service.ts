import {
  CollectionItemSort,
  CollectionItemType,
  setFieldMeta
} from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import { DEFAULT_NOTEBOOK_ID, ROOT_COLLECTION } from '@/constants';
import localChangesService from '@/domain/local-changes/local-changes.service';
import { LocalChangeType } from '@/domain/local-changes/model';
import { Notebook, NotebookResult } from '@/notebooks/notebooks';
import { getUniqueId } from 'tinybase/with-schemas';
import collectionService from './collection.service';
import navService from './nav.service';
import storageService from './storage.service';
import {
  useCellWithRef,
  useResultSortedRowIdsWithRef,
  useTableWithRef
} from './tinybase/hooks';
import { defaultOrder } from './types/space-types';
import userSettingsService from './user-settings.service';

class NotebooksService {
  private readonly storeId = 'space';
  private readonly table = 'collection';
  private readonly spacesTable = 'spaces';

  private fetchAllNotebooksQuery(parent?: string, deleted: boolean = false) {
    const queries = storageService.getSpaceQueries();
    const queryName = `fetchAllNotebooksFor${parent ? parent : ROOT_COLLECTION}`;
    if (!queries.hasQuery(queryName)) {
      queries.setQueryDefinition(queryName, this.table, ({ select, where }) => {
        select('title');
        select('created');
        select('order');
        where('type', CollectionItemType.notebook);
        where('parent', parent ? parent : ROOT_COLLECTION);
        where('deleted', deleted);
      });
    }
    return queryName;
  }

  public initNotebooks() {
    if (!this.hasOneNotebook()) {
      console.log('[storage] no local notebooks detected, creating default');
      this.addDefaultNotebook();
      navService.setCurrentFolder(DEFAULT_NOTEBOOK_ID);
    }
  }

  public hasOneNotebook() {
    return this.getNotebooks().length > 0;
  }

  private addDefaultNotebook() {
    const { item } = this.getNewNotebookObj(
      ROOT_COLLECTION,
      getGlobalTrans().defaultNotebookName
    );
    const id = DEFAULT_NOTEBOOK_ID;
    storageService.getSpace().setRow(this.table, id, { ...item, itemId: id });
    localChangesService.addLocalChange('collection', id, LocalChangeType.add);
  }

  public addNotebook(title: string, parent: string = ROOT_COLLECTION) {
    const { item, id } = this.getNewNotebookObj(parent, title);
    storageService.getSpace().setRow(this.table, id, item);
    localChangesService.addLocalChange('collection', id, LocalChangeType.add);
    return id!;
  }

  public getNewNotebookObj(parent: string, title?: string) {
    const now = Date.now();
    const id = getUniqueId();
    const item: Notebook = {
      itemId: id,
      title: title || '',
      title_meta: setFieldMeta(title || '', now),
      parent: parent ? parent : ROOT_COLLECTION,
      parent_meta: setFieldMeta(parent ? parent : ROOT_COLLECTION, now),
      created: Date.now(),
      updated: Date.now(),
      type: CollectionItemType.notebook,
      deleted: false,
      deleted_meta: setFieldMeta('false', now),
      order: defaultOrder, // TODO dynamic order
      order_meta: setFieldMeta('0', now)
    };
    return {
      item,
      id
    };
  }

  public deleteNotebook(id: string): void {
    // TODO handle nested notebooks
    // if items inside, delete them
    const items = collectionService.getCollectionItems(id);
    if (items.length > 0) {
      storageService.getSpace().transaction(() => {
        items.forEach(i => collectionService.deleteItem(i.id));
      });
    }
    storageService.getSpace().delRow(this.table, id);
    localChangesService.addLocalChange(
      'collection',
      id,
      LocalChangeType.delete
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
        ?.valueOf() as string) || DEFAULT_NOTEBOOK_ID
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

  public getNotebooks(parent?: string, sort?: CollectionItemSort) {
    if (!sort) {
      sort = userSettingsService.getSpaceDefaultDisplayOpts().sort;
    }
    const table = storageService.getSpace().getTable(this.table);
    const queryName = this.fetchAllNotebooksQuery(parent);
    return storageService
      .getSpaceQueries()
      .getResultSortedRowIds(queryName, sort.by, sort.descending)
      .map(rowId => {
        const row = table[rowId];
        return { ...row, id: rowId } as NotebookResult;
      });
  }

  public useNotebooks(parent?: string, sort?: CollectionItemSort) {
    if (!sort) {
      sort = { by: 'order', descending: false };
    }
    const table = useTableWithRef(this.storeId, this.table);
    const queryName = this.fetchAllNotebooksQuery(parent);
    return useResultSortedRowIdsWithRef(
      this.storeId,
      queryName,
      sort.by,
      sort.descending
    ).map(rowId => {
      const row = table[rowId];
      return { ...row, id: rowId } as NotebookResult;
    });
  }
}

const notebooksService = new NotebooksService();
export default notebooksService;
