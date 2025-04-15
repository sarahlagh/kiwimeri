import {
  CollectionItemResult,
  CollectionItemType
} from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import { FAKE_ROOT, ROOT_FOLDER } from '@/constants';
import { Id } from 'tinybase/common/with-schemas';
import { useCell, useResultSortedRowIds, useTable } from 'tinybase/ui-react';
import storageService from './storage.service';

export const initialContent = () => {
  // 'empty' editor
  return '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
};

class CollectionService {
  private readonly collectionTable = 'collection';
  private readonly contentTable = 'content';

  private fetchAllCollectionItemsQuery(
    parent: string,
    deleted: boolean = false
  ) {
    const queries = storageService.getSpaceQueries();
    const queryName = `fetchAllCollectionItemsFor${parent}`;
    if (parent !== FAKE_ROOT && !queries.hasQuery(queryName)) {
      queries.setQueryDefinition(
        queryName,
        this.collectionTable,
        ({ select, where }) => {
          select('title');
          select('type');
          select('created');
          select('updated');
          where('parent', parent);
          where('deleted', deleted);
        }
      );
    }
    return queryName;
  }

  public useCollectionItems(
    parent: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ): CollectionItemResult[] {
    const table = useTable(this.collectionTable);
    const queryName = this.fetchAllCollectionItemsQuery(parent);
    return useResultSortedRowIds(queryName, sortBy, descending).map(rowId => {
      const row = table[rowId];
      return { ...row, id: rowId } as CollectionItemResult;
    });
  }

  public addDocument(parent: string) {
    const now = Date.now();
    const id = storageService.getSpace().addRow(this.collectionTable, {
      title: getGlobalTrans().newDocTitle,
      parent: parent,
      created: now,
      updated: now,
      type: CollectionItemType.document,
      deleted: false
    });
    if (id) {
      storageService.getSpace().setRow(this.contentTable, id, {
        content: initialContent()
      });
    }
    this.updateParentUpdatedRecursive(parent);
  }

  public addFolder(parent: string) {
    const now = Date.now();
    storageService.getSpace().addRow(this.collectionTable, {
      title: getGlobalTrans().newFolderTitle,
      parent: parent,
      created: now,
      updated: now,
      type: CollectionItemType.folder,
      deleted: false
    });
  }

  public deleteItem(rowId: Id) {
    this.updateParentUpdatedRecursive(this.getItemParent(rowId));
    return storageService.getSpace().delRow(this.collectionTable, rowId);
  }

  public itemExists(rowId: Id) {
    if (rowId === ROOT_FOLDER) {
      return true;
    }
    return storageService.getSpace().hasRow(this.collectionTable, rowId);
  }

  public getItemParent(rowId: Id) {
    return (
      (storageService
        .getSpace()
        .getCell(this.collectionTable, rowId, 'parent')
        ?.valueOf() as string) || ROOT_FOLDER
    );
  }

  public setItemParent(rowId: Id, parentId: Id) {
    storageService
      .getSpace()
      .setCell(this.collectionTable, rowId, 'parent', parentId);
    this.updateParentUpdatedRecursive(this.getItemParent(rowId));
  }

  public useItemTitle(rowId: Id) {
    const defaultValue =
      rowId === ROOT_FOLDER ? getGlobalTrans().homeTitle : '';
    return (
      (useCell(this.collectionTable, rowId, 'title')?.valueOf() as string) ||
      defaultValue
    );
  }

  public getItemTitle(rowId: Id) {
    const defaultValue =
      rowId === ROOT_FOLDER ? getGlobalTrans().homeTitle : '';
    return (
      (storageService
        .getSpace()
        .getCell(this.collectionTable, rowId, 'title')
        ?.valueOf() as string) || defaultValue
    );
  }

  public setItemTitle(rowId: Id, title: string) {
    storageService
      .getSpace()
      .setCell(this.collectionTable, rowId, 'title', title);
    storageService
      .getSpace()
      .setCell(this.collectionTable, rowId, 'updated', Date.now());
    this.updateParentUpdatedRecursive(this.getItemParent(rowId));
  }

  public getItemContent(rowId: Id) {
    return (
      (storageService
        .getSpace()
        .getCell(this.contentTable, rowId, 'content')
        ?.valueOf() as string) || null
    );
  }

  public useItemContent(rowId: Id) {
    return (
      (useCell(this.contentTable, rowId, 'content')?.valueOf() as string) ||
      null
    );
  }

  public setItemContent(rowId: Id, content: string) {
    storageService.getSpace().transaction(() => {
      storageService
        .getSpace()
        .setCell(this.contentTable, rowId, 'content', () => content);
      storageService
        .getSpace()
        .setCell(this.collectionTable, rowId, 'updated', Date.now());
      this.updateParentUpdatedRecursive(this.getItemParent(rowId));
    });
  }

  public getItemType(rowId: Id) {
    return (
      (storageService
        .getSpace()
        .getCell(this.collectionTable, rowId, 'type')
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
      .setCell(this.collectionTable, folder, 'updated', Date.now());
    this.updateParentUpdatedRecursive(this.getItemParent(folder));
  }
}

const collectionService = new CollectionService();
export default collectionService;
