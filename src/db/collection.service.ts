import {
  CollectionItemFieldEnum,
  CollectionItemResult,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableFieldEnum,
  setFieldMeta
} from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import { FAKE_ROOT, ROOT_FOLDER } from '@/constants';
import { getUniqueId } from 'tinybase/common';
import { Id } from 'tinybase/common/with-schemas';
import localChangesService from './localChanges.service';
import notebooksService from './notebooks.service';
import storageService from './storage.service';
import {
  useCellWithRef,
  useResultSortedRowIdsWithRef,
  useTableWithRef
} from './tinybase/hooks';
import { LocalChangeType } from './types/store-types';

export const initialContent = () => {
  // 'empty' editor
  return '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
};

class CollectionService {
  private readonly storeId = 'space';
  private readonly table = 'collection';

  private fetchCollectionItemsPerParentQuery(
    notebook: string,
    parent: string,
    deleted: boolean = false
  ) {
    const queries = storageService.getSpaceQueries();
    const queryName = `fetchAllCollectionItemsIn${notebook}For${parent}`;
    if (parent !== FAKE_ROOT && !queries.hasQuery(queryName)) {
      queries.setQueryDefinition(queryName, this.table, ({ select, where }) => {
        select('title');
        select('type');
        select('tags');
        select('created');
        select('updated');
        select('conflict');
        where('notebook', notebook);
        where('parent', parent);
        where('deleted', deleted);
        where(getCell => {
          const type = getCell('type')?.valueOf();
          return (
            type === CollectionItemType.document ||
            type === CollectionItemType.folder
          );
        });
      });
    }
    return queryName;
  }

  private fetchCollectionItemsPerNotebookQuery(
    notebook?: string,
    deleted: boolean = false
  ) {
    const queries = storageService.getSpaceQueries();
    const queryName = `fetchAllCollectionItems`;
    if (!queries.hasQuery(queryName)) {
      queries.setQueryDefinition(queryName, this.table, ({ select, where }) => {
        select('title');
        select('type');
        select('tags');
        select('created');
        select('updated');
        select('conflict');
        where('deleted', deleted);
        if (notebook) {
          where('notebook', notebook);
        }
        where(getCell => {
          const type = getCell('type')?.valueOf();
          return (
            type === CollectionItemType.document ||
            type === CollectionItemType.folder
          );
        });
      });
    }
    return queryName;
  }

  public getAllCollectionItems(
    notebook?: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ) {
    const table = storageService.getSpace().getTable(this.table);
    const queryName = this.fetchCollectionItemsPerNotebookQuery(notebook);
    return storageService
      .getSpaceQueries()
      .getResultSortedRowIds(queryName, sortBy, descending)
      .map(rowId => {
        const row = table[rowId];
        return { ...row, id: rowId } as CollectionItemResult;
      });
  }

  public getCollectionItems(
    parent: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ) {
    const notebook = notebooksService.getCurrentNotebook();
    const table = storageService.getSpace().getTable(this.table);
    const queryName = this.fetchCollectionItemsPerParentQuery(notebook, parent);
    return storageService
      .getSpaceQueries()
      .getResultSortedRowIds(queryName, sortBy, descending)
      .map(rowId => {
        const row = table[rowId];
        return { ...row, id: rowId } as CollectionItemResult;
      });
  }

  public useCollectionItems(
    parent: string,
    notebook?: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ): CollectionItemResult[] {
    const currentNotebook = notebooksService.useCurrentNotebook();
    const notebookId = notebook ? notebook : currentNotebook;
    const table = useTableWithRef(this.storeId, this.table);
    const queryName = this.fetchCollectionItemsPerParentQuery(
      notebookId,
      parent
    );
    return useResultSortedRowIdsWithRef(
      this.storeId,
      queryName,
      sortBy,
      descending
    ).map(rowId => {
      const row = table[rowId];
      return { ...row, id: rowId } as CollectionItemResult;
    });
  }

  public addDocument(parent: string) {
    const notebook = notebooksService.getCurrentNotebook();
    console.debug('noteboook', notebook);
    const now = Date.now();
    const id = getUniqueId();
    const content = initialContent();
    storageService.getSpace().setRow(this.table, id, {
      title: getGlobalTrans().newDocTitle,
      title_meta: setFieldMeta(getGlobalTrans().newDocTitle, now),
      parent,
      parent_meta: setFieldMeta(parent, now),
      notebook,
      notebook_meta: setFieldMeta(notebook, now),
      content,
      content_meta: setFieldMeta(content, now),
      tags: '',
      tags_meta: setFieldMeta('', now),
      created: now,
      updated: now,
      type: CollectionItemType.document,
      deleted: false,
      deleted_meta: setFieldMeta('false', now)
    });
    this.updateParentUpdatedRecursive(parent);
    localChangesService.addLocalChange(id, LocalChangeType.add);
    return id;
  }

  public addFolder(parent: string) {
    const notebook = notebooksService.getCurrentNotebook();
    const now = Date.now();
    const id = getUniqueId();
    storageService.getSpace().setRow(this.table, id, {
      title: getGlobalTrans().newFolderTitle,
      title_meta: setFieldMeta(getGlobalTrans().newFolderTitle, now),
      parent: parent,
      parent_meta: setFieldMeta(parent, now),
      notebook,
      notebook_meta: setFieldMeta(notebook, now),
      tags: '',
      tags_meta: setFieldMeta('', now),
      created: now,
      updated: now,
      type: CollectionItemType.folder,
      deleted: false,
      deleted_meta: setFieldMeta('false', now)
    });
    localChangesService.addLocalChange(id, LocalChangeType.add);
    return id;
  }

  public deleteItem(rowId: Id, moveItemsUp = false) {
    const notebook = notebooksService.getCurrentNotebook();
    this.updateParentUpdatedRecursive(this.getItemParent(rowId));
    const wasFolder = this.getItemType(rowId) === CollectionItemType.folder;
    const parent = this.getItemParent(rowId);
    localChangesService.addLocalChange(rowId, LocalChangeType.delete);
    if (wasFolder) {
      const queryName = this.fetchCollectionItemsPerParentQuery(
        notebook,
        rowId
      );
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

  public itemExists(rowId: Id, notebook?: string) {
    if (rowId === ROOT_FOLDER) {
      return true;
    }
    if (notebook !== undefined) {
      return this.getItemField(rowId, 'notebook') === notebook;
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
      useCellWithRef<string>(this.storeId, this.table, rowId, 'title') ||
      defaultValue
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
    return (
      useCellWithRef<string>(this.storeId, this.table, rowId, 'content') || null
    );
  }

  public setItemContent(rowId: Id, content: string) {
    this.setItemField(rowId, 'content', content);
  }

  public setItemNotebookFolder(rowId: Id, notebookId: Id, parentId: string) {
    storageService.getSpace().transaction(() => {
      this.setItemParent(rowId, parentId);
      this.setItemField(rowId, 'notebook', notebookId);
    });
  }

  public useItemTags(rowId: Id) {
    return new Set(
      (useCellWithRef<string>(this.storeId, this.table, rowId, 'tags') || '')
        .split(',')
        .filter(t => t.length > 0)
    );
  }

  public getItemTags(rowId: Id) {
    return new Set(
      (
        (storageService
          .getSpace()
          .getCell(this.table, rowId, 'tags')
          ?.valueOf() as string) || ''
      )
        .split(',')
        .filter(t => t.length > 0)
    );
  }

  public addItemTag(rowId: Id, tag: string) {
    const tags = this.getItemTags(rowId);
    tags.add(tag);
    this.setItemField(rowId, 'tags', [...tags].join(','));
  }

  public addItemTags(rowId: Id, tags: string[]) {
    const currentTags = this.getItemTags(rowId);
    tags.forEach(tag => {
      currentTags.add(tag);
    });
    this.setItemField(rowId, 'tags', [...currentTags].join(','));
  }

  public setItemTags(rowId: Id, tags: string[]) {
    this.setItemField(rowId, 'tags', [...tags].join(','));
  }

  public delItemTag(rowId: Id, tag: string) {
    const tags = this.getItemTags(rowId);
    tags.delete(tag);
    this.setItemField(rowId, 'tags', [...tags].join(','));
  }

  public renameItemTag(rowId: Id, tag1: string, tag2: string) {
    const tags = this.getItemTags(rowId);
    tags.delete(tag1);
    tags.add(tag2);
    this.setItemField(rowId, 'tags', [...tags].join(','));
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
          setFieldMeta(`${value}`, updated)
        );
      if (key !== 'parent' && key !== 'notebook') {
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
}

const collectionService = new CollectionService();
export default collectionService;
