import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_ORDER,
  getGlobalTrans,
  ROOT_COLLECTION
} from '@/constants';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { setMetaField } from '@/core/db/types';
import { CollectionItemType } from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import { Notebook, NotebookSort } from '@/domain/collection/notebooks';
import { resumeService } from '@/domain/collection/resume-state.service';
import { getUniqueId } from 'tinybase/with-schemas';
import fetchItemsQuery from './queries/fetchItemsQuery';

const C = SpaceTables.Collection;

class NotebooksService {
  public initNotebooks() {
    if (!this.hasOneNotebook()) {
      console.log('[storage] no local notebooks detected, creating default');
      this.addDefaultNotebook();
      this.setCurrentNotebook(DEFAULT_NOTEBOOK_ID);
      resumeService.setLastFolder(DEFAULT_NOTEBOOK_ID);
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
    const row = { ...item, itemId: id };
    space.transaction(() => {
      const tmpTable = space.getTable(SpaceTables.Collection);
      tmpTable[id] = row;
      collectionService.calcState(id, tmpTable);
      space.setRow(C, id, row);
    });
  }

  public addNotebook(title: string, parent: string = ROOT_COLLECTION) {
    const { item, id } = this.getNewNotebookObj(parent, title);
    space.transaction(() => {
      const tmpTable = space.getTable(SpaceTables.Collection);
      tmpTable[id] = { ...item, itemId: id };
      collectionService.calcState(id, tmpTable);
      space.setRow(C, id, item);
    });
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
      parentId: parent,
      parentId_meta: setMetaField(now, parent),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      type: CollectionItemType.notebook,
      order: DEFAULT_ORDER, // TODO dynamic order
      order_meta: setMetaField(now, 0)
    };
    return {
      item,
      id
    };
  }

  public deleteNotebook(parentId: string): void {
    // TODO handle nested notebooks
    // if items inside, delete them
    const items = fetchItemsQuery.getResults({ parentId });
    if (items.length > 0) {
      space.transaction(() => {
        items.forEach(i => collectionService.deleteItem(i.id));
      });
    }
    space.delRow(C, parentId);
  }

  public setCurrentNotebook(notebookId: string) {
    space.setValue('currentNotebook', notebookId);
  }

  public getCurrentNotebook() {
    return space.getValue('currentNotebook') || DEFAULT_NOTEBOOK_ID;
  }

  public setNotebookTitle(id: string, title: string) {
    collectionService.setItemTitle(id, title);
  }

  public getNotebooks(parentId?: string, sort?: NotebookSort) {
    if (!sort) {
      sort = { by: 'createdAt', descending: false };
    }
    return fetchItemsQuery.getResults(
      {
        parentId: parentId || ROOT_COLLECTION,
        restrictType: CollectionItemType.notebook
      },
      sort.by,
      sort.descending
    );
  }
}

const notebooksService = new NotebooksService();
export default notebooksService;
