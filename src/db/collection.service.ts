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
import { FAKE_ROOT, ROOT_FOLDER } from '@/constants';
import formatterService from '@/format-conversion/formatter.service';
import { SerializedEditorState } from 'lexical';
import { getUniqueId } from 'tinybase/common';
import { Id } from 'tinybase/common/with-schemas';
import { Table } from 'tinybase/store';
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
  private readonly previewSize = 80;

  private fetchDocsAndFoldersPerParentQuery(
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
        select('preview');
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
          return type !== CollectionItemType.notebook;
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

  public getBrowsableCollectionItems(
    parent: string,
    notebook?: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ) {
    if (!notebook) {
      notebook = notebooksService.getCurrentNotebook();
    }
    const table = storageService.getSpace().getTable(this.table);
    const queryName = this.fetchDocsAndFoldersPerParentQuery(notebook, parent);
    return storageService
      .getSpaceQueries()
      .getResultSortedRowIds(queryName, sortBy, descending)
      .map(rowId => {
        const row = table[rowId];
        return { ...row, id: rowId } as CollectionItemResult;
      });
  }

  public useBrowsableCollectionItems(
    parent: string,
    notebook?: string,
    sortBy: 'created' | 'updated' = 'created',
    descending = false
  ): CollectionItemResult[] {
    const currentNotebook = notebooksService.useCurrentNotebook();
    const notebookId = notebook ? notebook : currentNotebook;
    const table = useTableWithRef(this.storeId, this.table);
    const queryName = this.fetchDocsAndFoldersPerParentQuery(
      notebookId,
      parent
    );
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

  public getNewDocumentObj(parent: string, notebook?: string) {
    if (!notebook) {
      notebook = notebooksService.getCurrentNotebook();
    }
    const id = getUniqueId();
    const now = Date.now();
    const content = initialContent();
    const item: CollectionItem = {
      title: getGlobalTrans().newDocTitle,
      title_meta: setFieldMeta(getGlobalTrans().newDocTitle, now),
      parent,
      parent_meta: setFieldMeta(parent, now),
      notebook,
      notebook_meta: setFieldMeta(notebook, now),
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

  public getNewFolderObj(parent: string, notebook?: string) {
    if (!notebook) {
      notebook = notebooksService.getCurrentNotebook();
    }
    const now = Date.now();
    const id = getUniqueId();
    const item: CollectionItem = {
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
    };
    return { item, id };
  }

  public addFolder(parent: string) {
    const { item, id } = this.getNewFolderObj(parent);
    this.saveItem(item, id);
    return id;
  }

  public getNewPageObj(document: string, notebook?: string) {
    if (!notebook) {
      notebook = notebooksService.getCurrentNotebook();
    }
    const id = getUniqueId();
    const now = Date.now();
    const content = initialContent();
    const item: Omit<CollectionItem, 'title' | 'title_meta'> = {
      parent: document,
      parent_meta: setFieldMeta(document, now),
      notebook,
      notebook_meta: setFieldMeta(notebook, now),
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
    storageService.getSpace().setRow(this.table, id, item);
    if (parent) {
      this.updateParentUpdatedRecursive(parent);
    }
    localChangesService.addLocalChange(id, changeType);
    return id;
  }

  public deleteItem(rowId: Id, moveItemsUp = false) {
    const notebook = notebooksService.getCurrentNotebook();
    this.updateParentUpdatedRecursive(this.getItemParent(rowId));
    const wasFolder = this.getItemType(rowId) === CollectionItemType.folder;
    const wasDocument = this.getItemType(rowId) === CollectionItemType.document;
    const parent = this.getItemParent(rowId);
    localChangesService.addLocalChange(rowId, LocalChangeType.delete);
    if (wasFolder) {
      const queryName = this.fetchDocsAndFoldersPerParentQuery(notebook, rowId);
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

  public setItemParent(rowId: Id, parentId: Id, notebookId?: Id) {
    storageService.getSpace().transaction(() => {
      this.setItemField(rowId, 'parent', parentId);
      if (notebookId) {
        this.setItemField(rowId, 'notebook', notebookId);
      }
    });
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
      if (
        (key !== 'parent' && key !== 'notebook') ||
        type === CollectionItemType.page
      ) {
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
      this.updateParentUpdatedRecursive(this.getItemParent(rowId));
    }
  }

  public getItemField(rowId: Id, key: CollectionItemFieldEnum) {
    return storageService.getSpace().getCell('collection', rowId, key);
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
