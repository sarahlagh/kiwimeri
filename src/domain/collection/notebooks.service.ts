import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_ORDER,
  ROOT_COLLECTION,
  tt
} from '@/constants';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { setMetaField } from '@/core/db/types';
import {
  CollectionItemRow,
  CollectionItemType
} from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import { Notebook, NotebookSort } from '@/domain/collection/notebooks';
import { resumeService } from '@/domain/collection/resume-state.service';
import { getUniqueId } from 'tinybase/with-schemas';
import {
  CollectionTable,
  projectionEngine,
  ProjectionTable
} from './collection-projection.service';
import fetchItemsQuery from './queries/fetchItemsQuery';

const C = SpaceTables.Collection;
const ProjectedState = SpaceTables.ProjectedState;

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
      tt('defaultNotebookName')
    );
    const id = DEFAULT_NOTEBOOK_ID;
    const nextCollection = space.getTable(C) as CollectionTable;
    const nextProjection = space.getTable(ProjectedState) as ProjectionTable;
    const row = { ...item, itemId: id };
    nextCollection[id] = row;
    space.transaction(() => {
      projectionEngine.__fillInBreadcrumbs(id, nextCollection, nextProjection);
      space.setRow(C, id, row);
      projectionEngine.__recalcAncestryLastActivityAt(
        id,
        nextCollection,
        nextProjection
      );
    });
  }

  // TODO why is it different from saveItem
  public addNotebook(title: string, parent: string = ROOT_COLLECTION) {
    const { item, id } = this.getNewNotebookObj(parent, title);
    const nextCollection = space.getTable(C) as CollectionTable;
    const nextProjection = space.getTable(ProjectedState) as ProjectionTable;
    const row: CollectionItemRow = { ...item, itemId: id };
    nextCollection[id] = row;
    space.transaction(() => {
      projectionEngine.__fillInBreadcrumbs(id, nextCollection, nextProjection);
      space.setRow(C, id, row);
      projectionEngine.__recalcAncestryLastActivityAt(
        id,
        nextCollection,
        nextProjection
      );
    });
    return id!;
  }

  public getNewNotebookObj(_parent: string, title?: string) {
    const now = Date.now();
    const id = getUniqueId();
    const parent = _parent ? _parent : ROOT_COLLECTION;
    const item: Notebook = {
      title: title || '',
      title_meta: setMetaField(now, title || ''),
      parentId: parent,
      parentId_meta: setMetaField(now, parent),
      createdAt: now,
      updatedAt: now,
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
    // collectionService.deleteItem(parentId) // why not???
    space.delRow(C, parentId);
    // TODO how about projected states????
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
