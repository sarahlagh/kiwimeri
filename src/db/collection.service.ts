import {
  CollectionItem,
  CollectionItemFieldEnum,
  CollectionItemResult,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableFieldEnum,
  CollectionItemUpdate,
  setFieldMeta
} from '@/collection/collection';
import { minimizeContentForStorage } from '@/common/wysiwyg/compress-file-content';
import { getGlobalTrans } from '@/config';
import { ROOT_COLLECTION } from '@/constants';
import formatterService from '@/format-conversion/formatter.service';
import { SerializedEditorState } from 'lexical';
import { getUniqueId } from 'tinybase/common';
import { Id } from 'tinybase/common/with-schemas';
import { Table } from 'tinybase/store';
import localChangesService from './localChanges.service';
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
  private readonly previewSize = 80;

  private fetchAllPerParentQuery(parent: string, deleted: boolean = false) {
    const queries = storageService.getSpaceQueries();
    const queryName = `fetchAllForParent${parent}`;
    if (!queries.hasQuery(queryName)) {
      queries.setQueryDefinition(queryName, this.table, ({ select, where }) => {
        select('title');
        select('type');
        select('tags');
        select('created');
        select('updated');
        select('conflict');
        select('preview');
        where('parent', parent);
        where('deleted', deleted);
      });
    }
    return queryName;
  }

  private fetchDocsFoldersNotebooksPerParentQuery(
    parent: string,
    deleted: boolean = false
  ) {
    const queries = storageService.getSpaceQueries();
    const queryName = `fetchAllCollectionItemsFor${parent}`;
    if (!queries.hasQuery(queryName)) {
      queries.setQueryDefinition(queryName, this.table, ({ select, where }) => {
        select('title');
        select('type');
        select('tags');
        select('created');
        select('updated');
        select('conflict');
        select('preview');
        where('parent', parent);
        where('deleted', deleted);
        where(getCell => {
          const type = getCell('type')?.valueOf();
          return type !== CollectionItemType.page;
        });
      });
    }
    return queryName;
  }

  private fetchPagesForDocQuery(document: string) {
    const queries = storageService.getSpaceQueries();
    const queryName = `fetchPagesForDoc${document}`;
    if (!queries.hasQuery(queryName)) {
      queries.setQueryDefinition(queryName, this.table, ({ select, where }) => {
        select('created');
        select('updated');
        select('preview');
        select('conflict');
        where('parent', document);
        where('type', CollectionItemType.page);
      });
    }
    return queryName;
  }

  private getResultsSorted(
    table: Table,
    queryName: string,
    sortBy: 'created' | 'updated',
    descending: boolean
  ) {
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
    const table = storageService.getSpace().getTable(this.table);
    const queryName = this.fetchAllPerParentQuery(parent);
    return this.getResultsSorted(table, queryName, sortBy, descending);
  }

  public getBrowsableCollectionItems(
    parent: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ) {
    const table = storageService.getSpace().getTable(this.table);
    const queryName = this.fetchDocsFoldersNotebooksPerParentQuery(parent);
    return this.getResultsSorted(table, queryName, sortBy, descending);
  }

  public getAllCollectionItemsRecursive(parent: string) {
    let results: CollectionItemResult[] = [];
    const level = collectionService.getCollectionItems(parent);
    results = [...level];
    const folders = level.filter(item => item.type !== CollectionItemType.page);
    folders.forEach(folder => {
      const subLevel = this.getAllCollectionItemsRecursive(folder.id);
      results = [...results, ...subLevel];
    });
    return results;
  }

  public useBrowsableCollectionItems(
    parent: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ): CollectionItemResult[] {
    const table = useTableWithRef(this.storeId, this.table);
    const queryName = this.fetchDocsFoldersNotebooksPerParentQuery(parent);
    return this.useResultsSorted(table, queryName, sortBy, descending);
  }

  public getDocumentPages(
    document: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ) {
    const table = storageService.getSpace().getTable(this.table);
    const queryName = this.fetchPagesForDocQuery(document);
    return storageService
      .getSpaceQueries()
      .getResultSortedRowIds(queryName, sortBy, descending)
      .map(rowId => {
        const row = table[rowId];
        return { ...row, id: rowId } as CollectionItemResult;
      });
  }

  public useDocumentPages(
    document: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ): CollectionItemResult[] {
    const table = useTableWithRef(this.storeId, this.table);
    const queryName = this.fetchPagesForDocQuery(document);
    return this.useResultsSorted(table, queryName, sortBy, descending);
  }

  private useResultsSorted(
    table: Table,
    queryName: string,
    sortBy: 'created' | 'updated',
    descending: boolean
  ) {
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

  public getNewDocumentObj(parent: string) {
    const id = getUniqueId();
    const now = Date.now();
    const content = initialContent();
    const item: CollectionItem = {
      title: getGlobalTrans().newDocTitle,
      title_meta: setFieldMeta(getGlobalTrans().newDocTitle, now),
      parent,
      parent_meta: setFieldMeta(parent, now),
      content,
      content_meta: setFieldMeta(content, now),
      preview: '',
      tags: '',
      tags_meta: setFieldMeta('', now),
      created: now,
      updated: now,
      type: CollectionItemType.document,
      deleted: false,
      deleted_meta: setFieldMeta('false', now)
    };
    return { item, id };
  }

  public addDocument(parent: string) {
    const { item, id } = this.getNewDocumentObj(parent);
    this.saveItem(item, id, parent);
    return id;
  }

  public getNewFolderObj(parent: string) {
    const now = Date.now();
    const id = getUniqueId();
    const item: CollectionItem = {
      title: getGlobalTrans().newFolderTitle,
      title_meta: setFieldMeta(getGlobalTrans().newFolderTitle, now),
      parent: parent,
      parent_meta: setFieldMeta(parent, now),
      tags: '',
      tags_meta: setFieldMeta('', now),
      created: now,
      updated: now,
      type: CollectionItemType.folder,
      deleted: false,
      deleted_meta: setFieldMeta('false', now)
    };
    return { item, id };
  }

  public addFolder(parent: string) {
    const { item, id } = this.getNewFolderObj(parent);
    this.saveItem(item, id);
    return id;
  }

  public getNewPageObj(document: string) {
    const id = getUniqueId();
    const now = Date.now();
    const content = initialContent();
    const item: Omit<CollectionItem, 'title' | 'title_meta'> = {
      parent: document,
      parent_meta: setFieldMeta(document, now),
      content,
      content_meta: setFieldMeta(content, now),
      preview: '',
      created: now,
      updated: now,
      type: CollectionItemType.page,
      deleted: false,
      deleted_meta: setFieldMeta('false', now)
    };
    return { item, id };
  }

  public addPage(document: string) {
    const { item, id } = this.getNewPageObj(document);
    this.saveItem(item as CollectionItem, id, document);
    return id;
  }

  public saveItem(
    item: CollectionItem | CollectionItemUpdate,
    id?: string,
    parent?: string
  ) {
    if (!id) {
      id = getUniqueId();
    }
    const changeType = this.itemExists(id)
      ? LocalChangeType.update
      : LocalChangeType.add;
    storageService.getSpace().setRow(this.table, id, { ...item });
    if (parent) {
      this.updateAllParentsInBreadcrumb(parent);
    }
    localChangesService.addLocalChange(id, changeType);
    return id;
  }

  public deleteItem(rowId: Id, moveItemsUp = false) {
    this.updateAllParentsInBreadcrumb(this.getItemParent(rowId));
    const wasFolder = this.getItemType(rowId) === CollectionItemType.folder;
    const wasDocument = this.getItemType(rowId) === CollectionItemType.document;
    const parent = this.getItemParent(rowId);
    localChangesService.addLocalChange(rowId, LocalChangeType.delete);
    if (wasFolder) {
      const queryName = this.fetchDocsFoldersNotebooksPerParentQuery(rowId);
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
    if (wasDocument) {
      const queryName = this.fetchPagesForDocQuery(rowId);
      const children = storageService
        .getSpaceQueries()
        .getResultSortedRowIds(queryName);
      console.debug(`document to delete had ${children.length} pages`);
      if (children.length > 0) {
        children.forEach(id => {
          this.deleteItem(id);
        });
      }
    }
    storageService.getSpace().delRow(this.table, rowId);
  }

  public itemExists(rowId: Id) {
    if (rowId === ROOT_COLLECTION) {
      return true;
    }
    return storageService.getSpace().hasRow(this.table, rowId);
  }

  public getItemParent(rowId: Id) {
    return (
      (storageService
        .getSpace()
        .getCell(this.table, rowId, 'parent')
        ?.valueOf() as string) || ROOT_COLLECTION
    );
  }

  public setItemParent(rowId: Id, parentId: Id) {
    this.setItemField(rowId, 'parent', parentId);
  }

  public getIsItemHomeFolder(rowId: Id) {
    const parent = this.getItemParent(rowId);
    const parentType = this.getItemType(parent);
    return parentType === CollectionItemType.notebook;
  }

  public useIsItemHomeFolder(rowId: Id) {
    const parent = this.useItemParent(rowId);
    const parentType = useCellWithRef<string>(
      this.storeId,
      this.table,
      parent,
      'type'
    ) as CollectionItemTypeValues;
    return parentType === CollectionItemType.notebook;
  }

  public useItemTitle(rowId: Id) {
    const isItemHomeFolder = this.useIsItemHomeFolder(rowId);
    const defaultValue = isItemHomeFolder ? getGlobalTrans().homeTitle : '';
    return (
      useCellWithRef<string>(this.storeId, this.table, rowId, 'title') ||
      defaultValue
    );
  }

  public getItemTitle(rowId: Id) {
    const isItemHomeFolder = this.getIsItemHomeFolder(rowId);
    const defaultValue = isItemHomeFolder ? getGlobalTrans().homeTitle : '';
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

  public useItemParent(rowId: Id) {
    return (
      useCellWithRef<string>(this.storeId, this.table, rowId, 'parent') ||
      ROOT_COLLECTION
    );
  }

  public useItemPreview(rowId: Id) {
    return (
      useCellWithRef<string>(this.storeId, this.table, rowId, 'preview') || null
    );
  }

  public setItemLexicalContent(rowId: Id, content: SerializedEditorState) {
    storageService.getSpace().transaction(() => {
      this.setItemField(rowId, 'content', minimizeContentForStorage(content));
      storageService
        .getSpace()
        .setCell(
          'collection',
          rowId,
          'preview',
          formatterService
            .getPlainTextFromLexical(JSON.stringify(content))
            .substring(0, this.previewSize)
        );
    });
  }

  public setUnsavedItemLexicalContent(
    item: Pick<CollectionItem, 'content' | 'preview'>,
    content: SerializedEditorState
  ) {
    item.content = minimizeContentForStorage(content);
    item.preview = formatterService
      .getPlainTextFromLexical(JSON.stringify(content))
      .substring(0, this.previewSize);
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
    const current = this.getItemField(rowId, key);
    if (current === value) {
      return; // don't add unnecessary changes
    }
    const updated = Date.now();
    const type = this.getItemType(rowId);
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
      if (key !== 'parent' || type === CollectionItemType.page) {
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
    if (key !== 'parent' || type === CollectionItemType.page) {
      this.updateAllParentsInBreadcrumb(this.getItemParent(rowId));
    }
  }

  public getItemField<T>(rowId: Id, key: CollectionItemFieldEnum) {
    return storageService.getSpace().getCell('collection', rowId, key) as T;
  }

  public saveItems(
    items: (CollectionItem | CollectionItemUpdate)[],
    parent?: string
  ) {
    storageService.getSpace().transaction(() => {
      items.forEach(item => {
        this.saveItem(item, item.id, parent);
      });
    });
  }

  public getBreadcrumb(folder: string, includeAllNotebooks = false) {
    let parent = folder;
    let breadcrumb: string[] = [];
    let nbNotebooks = 0;
    while (parent !== ROOT_COLLECTION && nbNotebooks < 2) {
      breadcrumb = [parent, ...breadcrumb];
      if (
        !includeAllNotebooks &&
        collectionService.getItemType(parent) === CollectionItemType.notebook
      ) {
        nbNotebooks++;
        break;
      }
      parent = this.getItemParent(parent);
    }
    return breadcrumb;
  }

  private updateAllParentsInBreadcrumb(folder: string) {
    if (folder === ROOT_COLLECTION) {
      return;
    }
    const breadcrumb = this.getBreadcrumb(folder);
    storageService.getSpace().transaction(() => {
      for (let i = 1; i < breadcrumb.length; i++) {
        storageService
          .getSpace()
          .setCell(this.table, breadcrumb[i], 'updated', Date.now());
      }
    });
  }
}

const collectionService = new CollectionService();
export default collectionService;
