import {
  CollectionItemResult,
  CollectionItemType
} from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import { FAKE_ROOT, ROOT_FOLDER } from '@/constants';
import { Id } from 'tinybase/common/with-schemas';
import { useCell, useResultSortedRowIds, useTable } from 'tinybase/ui-react';
import localChangesService from './localChanges.service';
import storageService from './storage.service';
import { LocalChangeType } from './types/store-types';

export const initialContent = () => {
  // 'empty' editor
  return '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
};

class CollectionService {
  private readonly table = 'collection';

  private fetchAllCollectionItemsQuery(
    parent: string,
    deleted: boolean = false
  ) {
    const queries = storageService.getSpaceQueries();
    const queryName = `fetchAllCollectionItemsFor${parent}`;
    if (parent !== FAKE_ROOT && !queries.hasQuery(queryName)) {
      queries.setQueryDefinition(queryName, this.table, ({ select, where }) => {
        select('title');
        select('type');
        select('created');
        select('updated');
        where('parent', parent);
        where('deleted', deleted);
      });
    }
    return queryName;
  }

  public useCollectionItems(
    parent: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ): CollectionItemResult[] {
    const table = useTable(this.table);
    const queryName = this.fetchAllCollectionItemsQuery(parent);
    return useResultSortedRowIds(queryName, sortBy, descending).map(rowId => {
      const row = table[rowId];
      return { ...row, id: rowId } as CollectionItemResult;
    });
  }

  public addDocument(parent: string) {
    const now = Date.now();
    const id = storageService.getSpace().addRow(this.table, {
      title: getGlobalTrans().newDocTitle,
      parent: parent,
      content: initialContent(),
      created: now,
      updated: now,
      type: CollectionItemType.document,
      deleted: false
    });
    this.updateParentUpdatedRecursive(parent);
    if (id) {
      localChangesService.addLocalChange(id, LocalChangeType.add);
    }
  }

  public addFolder(parent: string) {
    const now = Date.now();
    const id = storageService.getSpace().addRow(this.table, {
      title: getGlobalTrans().newFolderTitle,
      parent: parent,
      created: now,
      updated: now,
      type: CollectionItemType.folder,
      deleted: false
    });
    if (id) {
      localChangesService.addLocalChange(id, LocalChangeType.add);
    }
  }

  public deleteItem(rowId: Id) {
    this.updateParentUpdatedRecursive(this.getItemParent(rowId));
    storageService.getSpace().delRow(this.table, rowId);
    localChangesService.addLocalChange(rowId, LocalChangeType.delete);
  }

  public itemExists(rowId: Id) {
    if (rowId === ROOT_FOLDER) {
      return true;
    }
    return storageService.getSpace().hasRow(this.table, rowId);
  }

  public getItemParent(rowId: Id) {
    return (
      (storageService
        .getSpace()
        .getCell(this.table, rowId, 'parent')
        ?.valueOf() as string) || ROOT_FOLDER
    );
  }

  public setItemParent(rowId: Id, parentId: Id) {
    storageService.getSpace().setCell(this.table, rowId, 'parent', parentId);
    this.updateParentUpdatedRecursive(this.getItemParent(rowId));
    localChangesService.addLocalChange(rowId, LocalChangeType.update, 'parent');
  }

  public useItemTitle(rowId: Id) {
    const defaultValue =
      rowId === ROOT_FOLDER ? getGlobalTrans().homeTitle : '';
    return (
      (useCell(this.table, rowId, 'title')?.valueOf() as string) || defaultValue
    );
  }

  public getItemTitle(rowId: Id) {
    const defaultValue =
      rowId === ROOT_FOLDER ? getGlobalTrans().homeTitle : '';
    return (
      (storageService
        .getSpace()
        .getCell(this.table, rowId, 'title')
        ?.valueOf() as string) || defaultValue
    );
  }

  public setItemTitle(rowId: Id, title: string) {
    storageService.getSpace().setCell(this.table, rowId, 'title', title);
    storageService.getSpace().setCell(this.table, rowId, 'updated', Date.now());
    this.updateParentUpdatedRecursive(this.getItemParent(rowId));
    localChangesService.addLocalChange(rowId, LocalChangeType.update, 'title');
  }

  public getItemContent(rowId: Id) {
    return (
      (storageService
        .getSpace()
        .getCell(this.table, rowId, 'content')
        ?.valueOf() as string) || null
    );
  }

  public useItemContent(rowId: Id) {
    return (useCell(this.table, rowId, 'content')?.valueOf() as string) || null;
  }

  public setItemContent(rowId: Id, content: string) {
    storageService
      .getSpace()
      .setCell(this.table, rowId, 'content', () => content);
    storageService.getSpace().setCell(this.table, rowId, 'updated', Date.now());
    this.updateParentUpdatedRecursive(this.getItemParent(rowId));
    localChangesService.addLocalChange(
      rowId,
      LocalChangeType.update,
      'content'
    );
  }

  public getItemType(rowId: Id) {
    return (
      (storageService
        .getSpace()
        .getCell(this.table, rowId, 'type')
        ?.valueOf() as string) || null
    );
  }

  public getBreadcrumb(folder: string) {
    let parent = folder;
    let breadcrumb: string[] = [folder];
    while (parent !== ROOT_FOLDER) {
      parent = this.getItemParent(parent);
      breadcrumb = [parent, ...breadcrumb];
    }
    return breadcrumb;
  }

  private updateParentUpdatedRecursive(folder: string) {
    if (folder === ROOT_FOLDER) {
      return;
    }
    storageService
      .getSpace()
      .setCell(this.table, folder, 'updated', Date.now());
    this.updateParentUpdatedRecursive(this.getItemParent(folder));
  }
}

const collectionService = new CollectionService();
export default collectionService;
