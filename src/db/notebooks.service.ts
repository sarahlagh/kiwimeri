import { CollectionItemType } from '@/collection/collection';
import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_ORDER,
  DEFAULT_SPACE_ID,
  getGlobalTrans,
  ROOT_COLLECTION
} from '@/constants';
import { space, spaceQueries, store } from '@/core/db/store';
import { setMetaField } from '@/core/db/types';
import { settingsService } from '@/domain/collection-settings/collection-settings.service';
import { CollectionItemSort } from '@/domain/collection-settings/model';
import { Notebook, NotebookResult } from '@/notebooks/notebooks';
import { getUniqueId } from 'tinybase/with-schemas';
import collectionService from './collection.service';
import navService from './nav.service';
import {
  useCellWithRef,
  useResultSortedRowIdsWithRef,
  useTableWithRef
} from './tinybase/hooks';

class NotebooksService {
  private readonly storeId = 'space';
  private readonly table = 'collection';
  private readonly spacesTable = 'spaces';

  private fetchAllNotebooksQuery(parent?: string) {
    const queryName = `fetchAllNotebooksFor${parent ? parent : ROOT_COLLECTION}`;
    if (!spaceQueries.hasQuery(queryName)) {
      spaceQueries.setQueryDefinition(
        queryName,
        this.table,
        ({ select, where }) => {
          select('title');
          select('created');
          select('order');
          where('type', CollectionItemType.notebook);
          where('parent', parent ? parent : ROOT_COLLECTION);
        }
      );
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
    space.setRow(this.table, id, { ...item, itemId: id });
  }

  public addNotebook(title: string, parent: string = ROOT_COLLECTION) {
    const { item, id } = this.getNewNotebookObj(parent, title);
    space.setRow(this.table, id, item);
    return id!;
  }

  public getNewNotebookObj(_parent: string, title?: string) {
    const now = Date.now();
    const id = getUniqueId();
    const parent = _parent ? _parent : ROOT_COLLECTION;
    const item: Notebook = {
      itemId: id,
      title: title || '',
      title_meta: setMetaField(now, title || ''),
      parent,
      parent_meta: setMetaField(now, parent),
      created: Date.now(),
      updated: Date.now(),
      type: CollectionItemType.notebook,
      order: DEFAULT_ORDER, // TODO dynamic order
      order_meta: setMetaField(now, 0)
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
      space.transaction(() => {
        items.forEach(i => collectionService.deleteItem(i.id));
      });
    }
    space.delRow(this.table, id);
  }

  public getCurrentNotebook() {
    return (
      (store
        .getCell(this.spacesTable, DEFAULT_SPACE_ID, 'currentNotebook')
        ?.valueOf() as string) || DEFAULT_NOTEBOOK_ID
    );
  }

  public useCurrentNotebook() {
    return (
      useCellWithRef<string>(
        'store',
        this.spacesTable,
        DEFAULT_SPACE_ID,
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
      sort = settingsService.getSpaceDefaultSort();
    }
    const table = space.getTable(this.table);
    const queryName = this.fetchAllNotebooksQuery(parent);
    return spaceQueries
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
