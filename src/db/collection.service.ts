import {
  CollectionItemFieldEnum,
  CollectionItemResult,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableFieldEnum
} from '@/collection/collection';
import { fastHash } from '@/common/utils';
import { getGlobalTrans } from '@/config';
import { FAKE_ROOT, ROOT_FOLDER } from '@/constants';
import { getUniqueId } from 'tinybase/common';
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
    const id = getUniqueId();
    const content = initialContent();
    storageService.getSpace().setRow(this.table, id, {
      title: getGlobalTrans().newDocTitle,
      title_meta: this.setFieldMeta(getGlobalTrans().newDocTitle, now),
      parent,
      parent_meta: this.setFieldMeta(parent, now),
      content,
      content_meta: this.setFieldMeta(content, now),
      created: now,
      updated: now,
      type: CollectionItemType.document,
      deleted: false,
      deleted_meta: this.setFieldMeta('false', now)
    });
    this.updateParentUpdatedRecursive(parent);
    localChangesService.addLocalChange(id, LocalChangeType.add);
    return id;
  }

  public addFolder(parent: string) {
    const now = Date.now();
    const id = getUniqueId();
    storageService.getSpace().setRow(this.table, id, {
      title: getGlobalTrans().newFolderTitle,
      title_meta: this.setFieldMeta(getGlobalTrans().newFolderTitle, now),
      parent: parent,
      parent_meta: this.setFieldMeta(parent, now),
      created: now,
      updated: now,
      type: CollectionItemType.folder,
      deleted: false,
      deleted_meta: this.setFieldMeta('false', now)
    });
    localChangesService.addLocalChange(id, LocalChangeType.add);
    return id;
  }

  public deleteItem(rowId: Id, moveItemsUp = false) {
    this.updateParentUpdatedRecursive(this.getItemParent(rowId));
    const wasFolder = this.getItemType(rowId) === 'f';
    const parent = this.getItemParent(rowId);
    localChangesService.addLocalChange(rowId, LocalChangeType.delete);
    if (wasFolder) {
      const queryName = this.fetchAllCollectionItemsQuery(rowId);
      const children = storageService
        .getSpaceQueries()
        .getResultSortedRowIds(queryName);
      console.debug(`folder to delete had ${children.length} children`);
      if (children.length > 0) {
        children.forEach(id => {
          if (!moveItemsUp) {
            this.deleteItem(id);
          } else {
            this.setItemParent(id, parent);
          }
        });
      }
    }
    storageService.getSpace().delRow(this.table, rowId);
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
    this.setItemField(rowId, 'parent', parentId);
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
    this.setItemField(rowId, 'title', title);
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
    this.setItemField(rowId, 'content', content);
  }

  public getItemType(rowId: Id): CollectionItemTypeValues {
    return storageService
      .getSpace()
      .getCell(this.table, rowId, 'type')
      ?.valueOf() as CollectionItemTypeValues;
  }

  public isItemConflict(rowId: Id) {
    return (
      (storageService
        .getSpace()
        .getCell(this.table, rowId, 'conflict')
        ?.valueOf() as string) !== undefined || false
    );
  }

  private resetItemIfConflict(rowId: Id) {
    const isConflict = this.isItemConflict(rowId);
    if (isConflict) {
      storageService.getSpace().delCell(this.table, rowId, 'conflict');
    }
    return isConflict;
  }

  public setItemField(
    rowId: Id,
    key: CollectionItemUpdatableFieldEnum,
    value: string | boolean | number
  ) {
    const updated = Date.now();
    storageService.getSpace().transaction(() => {
      storageService.getSpace().setCell('collection', rowId, key, value);
      storageService
        .getSpace()
        .setCell(
          'collection',
          rowId,
          `${key}_meta`,
          this.setFieldMeta(`${value}`, updated)
        );
      if (key !== 'parent') {
        storageService
          .getSpace()
          .setCell('collection', rowId, 'updated', updated);
      }
      const wasConflict = this.resetItemIfConflict(rowId);
      localChangesService.addLocalChange(
        rowId,
        wasConflict ? LocalChangeType.add : LocalChangeType.update,
        key
      );
    });
    if (key !== 'parent') {
      this.updateParentUpdatedRecursive(this.getItemParent(rowId));
    }
  }

  public getItemField(rowId: Id, key: CollectionItemFieldEnum) {
    return storageService.getSpace().getCell('collection', rowId, key);
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

  private setFieldMeta(value: string, updated: number) {
    return JSON.stringify({ hash: fastHash(value), updated });
  }
}

const collectionService = new CollectionService();
export default collectionService;
