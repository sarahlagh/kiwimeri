import {
  CollectionItem,
  CollectionItemDisplayOpts,
  CollectionItemFieldEnum,
  CollectionItemFlags,
  CollectionItemHistorizableFields,
  CollectionItemResetConflictFields,
  CollectionItemResult,
  CollectionItemUpdateChangeFields as CollectionItemRowUpdateChangeFields,
  CollectionItemSort,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableFieldEnum,
  CollectionItemUpdate,
  isDocument,
  SortableCollectionItem
} from '@/collection/collection';
import { genericReorder } from '@/common/dnd/utils';
import { cellEquals } from '@/common/utils';
import {
  minimizeContentForStorage,
  unminimizeContentFromStorage
} from '@/common/wysiwyg/compress-file-content';
import { DEFAULT_ORDER, getGlobalTrans, ROOT_COLLECTION } from '@/constants';
import { space, spaceQueries } from '@/core/db/store';
import { DbSerializableData, setMetaField } from '@/core/db/types';
import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import { SerializedEditorState } from 'lexical';
import { getUniqueId } from 'tinybase/common';
import { AnyObject, Id } from 'tinybase/common/with-schemas';
import { Table } from 'tinybase/store';
import { searchAncestryService } from '../search/search-ancestry.service';
import { historyService } from './collection-history.service';
import notebooksService from './notebooks.service';
import { useCellWithRef, useResultSortedRowIdsWithRef } from './tinybase/hooks';
import userSettingsService from './user-settings.service';

export const initialContent = () => {
  // 'empty' editor
  return '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
};

export const INITIAL_CONTENT_START = '{"root":{';

class CollectionService {
  private readonly storeId = 'space';
  private readonly tableId = 'collection';

  private fetchAllPerParentQuery(parent: string, deleted: boolean = false) {
    const queryName = `fetchAllForParent${parent}`;
    if (!spaceQueries.hasQuery(queryName)) {
      spaceQueries.setQueryDefinition(
        queryName,
        this.tableId,
        ({ select, where }) => {
          select('title');
          select('type');
          select('tags');
          select('created');
          select('updated');
          select('conflict');
          select('order');
          where('parent', parent);
          where('deleted', deleted);
        }
      );
    }
    return queryName;
  }

  private fetchDocsFoldersNotebooksPerParentQuery(
    parent: string,
    deleted: boolean = false
  ) {
    const queryName = `fetchAllCollectionItemsFor${parent}`;
    if (!spaceQueries.hasQuery(queryName)) {
      spaceQueries.setQueryDefinition(
        queryName,
        this.tableId,
        ({ select, where }) => {
          select('title');
          select('type');
          select('tags');
          select('created');
          select('updated');
          select('conflict');
          select('order');
          where('parent', parent);
          where('deleted', deleted);
        }
      );
    }
    return queryName;
  }

  private fetchConflictsQuery() {
    const queryName = `fetchConflicts`;
    if (!spaceQueries.hasQuery(queryName)) {
      spaceQueries.setQueryDefinition(
        queryName,
        this.tableId,
        ({ select, where }) => {
          select('title');
          select('type');
          select('tags');
          select('created');
          select('updated');
          select('conflict');
          where(getCell => {
            const conflict = getCell('conflict')?.valueOf();
            return !!conflict;
          });
        }
      );
    }
    return queryName;
  }

  private useResultsSorted(
    table: Table,
    queryName: string,
    sort: { by: string; descending: boolean },
    limit?: number
  ) {
    const results = useResultSortedRowIdsWithRef(
      this.storeId,
      queryName,
      sort.by,
      sort.descending,
      0,
      limit
    ).map(rowId => {
      const row = table[rowId];
      return { ...row, id: rowId } as CollectionItemResult;
    });
    if (sort.by === 'preview') {
      return searchAncestryService.sortPerContentPreview(
        results,
        sort.descending
      );
    }
    return results;
  }

  private getResultsSorted(
    table: Table,
    queryName: string,
    sort: CollectionItemSort
  ) {
    const results = spaceQueries
      .getResultSortedRowIds(queryName, sort.by, sort.descending)
      .map(rowId => {
        const row = table[rowId];
        return { ...row, id: rowId } as CollectionItemResult;
      });
    if (sort.by === 'preview') {
      return searchAncestryService.sortPerContentPreview(
        results,
        sort.descending
      );
    }
    return results;
  }

  public getCollectionItems(parent: string, sort?: CollectionItemSort) {
    if (!sort) {
      sort = userSettingsService.getDefaultDisplayOpts().sort;
    }
    const table = space.getTable(this.tableId);
    const queryName = this.fetchAllPerParentQuery(parent);
    return this.getResultsSorted(table, queryName, sort);
  }

  public getBrowsableCollectionItems(
    parent: string,
    sort?: CollectionItemSort
  ) {
    if (!sort) {
      sort = userSettingsService.getDefaultDisplayOpts().sort;
    }
    return fetchItemsQuery.getResults(
      {
        parent,
        recursive: false,
        onlyDocuments: false,
        onlyConflicts: false
      },
      sort.by,
      sort.descending
    );
  }

  // TODO just use fetchItemsQuery without a parent
  public getAllCollectionItemsRecursive(
    parent: string,
    sort?: CollectionItemSort,
    cb?: (level: CollectionItemResult[]) => void
  ) {
    if (!sort) {
      sort = userSettingsService.getDefaultDisplayOpts().sort;
    }
    let results: CollectionItemResult[] = [];
    const level = this.getCollectionItems(parent, sort);
    if (cb) cb(level);
    results = [...level];
    level.forEach(folder => {
      const subLevel = this.getAllCollectionItemsRecursive(folder.id, sort);
      if (cb) cb(subLevel);
      results = [...results, ...subLevel];
      // sort again (tch..) TODO should rethink ancestry so i can do sorting from there
      this.sortResults(results, sort);
    });
    return results;
  }

  private sortResults(
    results: CollectionItemResult[],
    sort: CollectionItemSort
  ) {
    if (sort.by === 'preview') {
      return searchAncestryService.sortPerContentPreview(
        results,
        sort.descending
      );
    }
    results.sort((r1, r2) => {
      const a = sort.descending ? r2 : r1;
      const b = sort.descending ? r1 : r2;
      switch (sort.by) {
        case 'created':
        case 'updated':
        case 'order':
          return a[sort.by] - b[sort.by];
        case 'title':
          return a.title.localeCompare(b.title);
        case 'preview':
          return 0; // already covered above
      }
    });
  }

  public getConflicts(sort?: CollectionItemSort) {
    if (!sort) {
      sort = userSettingsService.getDefaultDisplayOpts().sort;
    }
    const table = space.getTable(this.tableId);
    const queryName = this.fetchConflictsQuery();
    return this.getResultsSorted(table, queryName, sort);
  }

  public getNewDocumentObj(parent: string) {
    const id = getUniqueId();
    const now = Date.now();
    const content = initialContent();
    const item: CollectionItem = {
      itemId: id,
      title: getGlobalTrans().newDocTitle,
      title_meta: setMetaField(now, getGlobalTrans().newDocTitle),
      parent,
      parent_meta: setMetaField(now, parent),
      content,
      content_meta: setMetaField(now, content),
      tags: '',
      tags_meta: setMetaField(now),
      created: now,
      updated: now,
      type: CollectionItemType.document,
      deleted: false,
      deleted_meta: setMetaField(now, false),
      order: DEFAULT_ORDER, // TODO dynamic order
      order_meta: setMetaField(now, 0)
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
      itemId: id,
      title: getGlobalTrans().newFolderTitle,
      title_meta: setMetaField(now, getGlobalTrans().newFolderTitle),
      parent: parent,
      parent_meta: setMetaField(now, parent),
      tags: '',
      tags_meta: setMetaField(now),
      created: now,
      updated: now,
      type: CollectionItemType.folder,
      deleted: false,
      deleted_meta: setMetaField(now, false),
      order: DEFAULT_ORDER, // TODO dynamic order
      order_meta: setMetaField(now, 0)
    };
    return { item, id };
  }

  public addFolder(parent: string) {
    const { item, id } = this.getNewFolderObj(parent);
    this.saveItem(item, id);
    return id;
  }

  // for tests
  public addNotebook(parent: string, title = '') {
    return notebooksService.addNotebook(title, parent);
  }

  public getItem(id: string) {
    return {
      ...space.getRow(this.tableId, id),
      id
    } as CollectionItem;
  }

  public saveItem(
    item: CollectionItem | CollectionItemUpdate,
    id?: string,
    parent?: string
  ) {
    if (!id) {
      id = getUniqueId();
    }
    space.transaction(() => {
      space.setRow(this.tableId, id, { ...item, itemId: id });
      if (parent) {
        this.updateAllParentsInBreadcrumb(parent);
      }
    });

    // TODO not sure why transaction breaks addVersionFromItem here - try startTransaction / endTransaction instead?
    // TODO should probably check if a relevant field has been updated here
    if (isDocument(item)) {
      historyService.saveVersionFromItem({ ...item, id } as CollectionItem);
    }
    return id;
  }

  public deleteItem(rowId: Id, moveItemsUp = false) {
    this.updateAllParentsInBreadcrumb(this.getItemParent(rowId));
    const itemType = this.getItemType(rowId);
    if (isDocument({ type: itemType })) {
      console.log('deleting document', rowId);
    }
    const wasFolder = itemType === CollectionItemType.folder;
    const wasDocument = itemType === CollectionItemType.document;
    const parent = this.getItemParent(rowId);
    if (wasFolder) {
      const queryName = this.fetchDocsFoldersNotebooksPerParentQuery(rowId);
      const children = spaceQueries.getResultSortedRowIds(queryName);
      console.debug(`folder to delete had ${children.length} children`);
      if (children.length > 0) {
        children.forEach(id => {
          if (!moveItemsUp) {
            this.deleteItem(id, undefined);
          } else {
            this.setItemParent(id, parent);
          }
        });
      }
    }
    if (wasDocument) {
      historyService.saveDeleteVersion(rowId);
    }
    space.delRow(this.tableId, rowId);
  }

  public itemExists(rowId: Id) {
    if (rowId === ROOT_COLLECTION) {
      return true;
    }
    return space.hasRow(this.tableId, rowId);
  }

  public getItemParent(rowId: Id) {
    return (
      (space.getCell(this.tableId, rowId, 'parent')?.valueOf() as string) ||
      ROOT_COLLECTION
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
      this.tableId,
      parent,
      'type'
    ) as CollectionItemTypeValues;
    return parentType === CollectionItemType.notebook;
  }

  public useItemTitle(rowId: Id) {
    const isItemHomeFolder = this.useIsItemHomeFolder(rowId);
    const defaultValue = isItemHomeFolder ? getGlobalTrans().homeTitle : '';
    return (
      useCellWithRef<string>(this.storeId, this.tableId, rowId, 'title') ||
      defaultValue
    );
  }

  public getItemTitle(rowId: Id) {
    const isItemHomeFolder = this.getIsItemHomeFolder(rowId);
    const defaultValue = isItemHomeFolder ? getGlobalTrans().homeTitle : '';
    return (
      (space.getCell(this.tableId, rowId, 'title')?.valueOf() as string) ||
      defaultValue
    );
  }

  public setItemTitle(rowId: Id, title: string) {
    this.setItemField(rowId, 'title', title);
  }

  public getItemContent(rowId: Id) {
    return (
      (space.getCell(this.tableId, rowId, 'content')?.valueOf() as string) ||
      null
    );
  }

  public useItemContent(rowId: Id) {
    return (
      useCellWithRef<string>(this.storeId, this.tableId, rowId, 'content') ||
      null
    );
  }

  public useItemParent(rowId: Id) {
    return (
      useCellWithRef<string>(this.storeId, this.tableId, rowId, 'parent') ||
      ROOT_COLLECTION
    );
  }

  public useItemType(rowId: Id) {
    return useCellWithRef<string>(this.storeId, this.tableId, rowId, 'type');
  }

  public setItemLexicalContent(
    rowId: Id,
    content: SerializedEditorState,
    skipVersion = false
  ) {
    this.setItemField(
      rowId,
      'content',
      minimizeContentForStorage(content),
      skipVersion
    );
  }

  public setUnsavedItemLexicalContent(
    item: Pick<CollectionItem, 'content'>,
    content: SerializedEditorState
  ) {
    item.content = minimizeContentForStorage(content);
  }

  public appendUnsavedLexicalContent(
    itemId: string,
    contentToAppend: SerializedEditorState
  ) {
    if (!this.itemExists(itemId) || !this.getItemContent(itemId))
      return contentToAppend;
    const existingContent = JSON.parse(
      unminimizeContentFromStorage(this.getItemContent(itemId)!)
    ) as SerializedEditorState;

    const newChildren = [
      ...existingContent.root.children,
      ...contentToAppend.root.children
    ];
    contentToAppend.root.children = newChildren;
    return contentToAppend;
  }

  // get display opts => raw data from db

  public useItemDisplayOpts(rowId: Id): CollectionItemDisplayOpts | undefined {
    const str =
      useCellWithRef<string>(
        this.storeId,
        this.tableId,
        rowId,
        'display_opts'
      ) || null;
    return str ? JSON.parse(str) : undefined;
  }

  public getItemDisplayOpts(rowId: Id): CollectionItemDisplayOpts | undefined {
    const str =
      (space
        .getCell(this.tableId, rowId, 'display_opts')
        ?.valueOf() as string) || '';

    return str ? JSON.parse(str) : undefined;
  }

  public useItemFlags(rowId: Id): CollectionItemFlags | undefined {
    return useCellWithRef<AnyObject>(
      this.storeId,
      this.tableId,
      rowId,
      'flags'
    );
  }

  public getItemFlags(rowId: Id): CollectionItemFlags | undefined {
    return space.getCell(this.tableId, rowId, 'flags');
  }

  // get effective display opts => data merged with defaults if needed

  public useItemEffectiveDisplayOpts(rowId: Id): CollectionItemDisplayOpts {
    const defaultDisplayOpts = userSettingsService.useDefaultDisplayOpts();
    const str =
      useCellWithRef<string>(
        this.storeId,
        this.tableId,
        rowId,
        'display_opts'
      ) || null;
    const obj = this.parseDisplayOpts(str);
    return obj ? obj : defaultDisplayOpts;
  }

  public getItemEffectiveDisplayOpts(rowId: Id): CollectionItemDisplayOpts {
    const str =
      (space
        .getCell(this.tableId, rowId, 'display_opts')
        ?.valueOf() as string) || null;
    const obj = this.parseDisplayOpts(str);
    return obj ? obj : userSettingsService.getDefaultDisplayOpts();
  }

  private parseDisplayOpts(str: string | null) {
    const obj = str ? JSON.parse(str) : null;
    if (obj && 'sort' in obj) {
      return obj as CollectionItemDisplayOpts;
    }
    return null;
  }

  public setItemDisplayOpts(
    rowId: Id,
    display_opts: CollectionItemDisplayOpts
  ) {
    if (display_opts.sort.by === 'order') display_opts.sort.descending = false;
    if (display_opts.documentSort?.by === 'order')
      display_opts.documentSort.descending = false;
    this.setItemField(rowId, 'display_opts', JSON.stringify(display_opts));
  }

  public setItemFlags(rowId: Id, flags: CollectionItemFlags) {
    this.setItemField(rowId, 'flags', flags);
  }

  public reorderItems(
    items: SortableCollectionItem[],
    from: number,
    to: number,
    parent?: string
  ) {
    space.transaction(() => {
      historyService.disableForBulk(() => {
        genericReorder(from, to, (idx, order) => {
          this.setItemField(
            items[idx].id,
            'order',
            order,
            parent !== undefined
          );
        });
      });
      if (parent && items.length > 0) {
        historyService.addVersion(parent);
      }
    });
  }

  public useItemTags(rowId: Id) {
    return new Set(
      (useCellWithRef<string>(this.storeId, this.tableId, rowId, 'tags') || '')
        .split(',')
        .filter(t => t.length > 0)
    );
  }

  public getItemTags(rowId: Id) {
    return new Set(
      ((space.getCell(this.tableId, rowId, 'tags')?.valueOf() as string) || '')
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
    return space
      .getCell(this.tableId, rowId, 'type')
      ?.valueOf() as CollectionItemTypeValues;
  }

  public isItemConflict(rowId: Id) {
    return space.getCell(this.tableId, rowId, 'conflict') !== undefined;
  }

  private resetItemIfConflict(rowId: Id) {
    const isConflict = this.isItemConflict(rowId);
    if (isConflict) {
      space.delCell(this.tableId, rowId, 'conflict');
    }
    return isConflict;
  }

  public shouldTriggerRowUpdatedChange(key: CollectionItemUpdatableFieldEnum) {
    return CollectionItemRowUpdateChangeFields.includes(key);
  }

  public isHistorizableContentChange(
    type: CollectionItemTypeValues,
    key: CollectionItemUpdatableFieldEnum
  ) {
    if (!isDocument(type)) return false;
    return CollectionItemHistorizableFields.includes(key);
  }

  public setItemField(
    rowId: Id,
    key: CollectionItemUpdatableFieldEnum,
    value: DbSerializableData,
    skipVersion = false
  ) {
    const current = this.getItemField(rowId, key);
    if (cellEquals(current, value)) {
      console.debug('no change, skipping', rowId, key);
      return false; // don't add unnecessary changes
    }
    const type = this.getItemType(rowId);
    const updated = Date.now();
    // title and content are real changes, order and display_opts are not (won't trigger an update ts)
    const isContentChange = this.shouldTriggerRowUpdatedChange(key);
    space.transaction(() => {
      space.setCell('collection', rowId, key, value as never);
      space.setCell(
        'collection',
        rowId,
        `${key}_meta`,
        setMetaField(updated, `${value}`)
      );

      if (isContentChange) {
        space.setCell('collection', rowId, 'updated', updated);
      }

      if (!skipVersion && this.isHistorizableContentChange(type, key)) {
        historyService.addVersion(rowId);
      }

      if (CollectionItemResetConflictFields.includes(key)) {
        this.resetItemIfConflict(rowId);
      }
    });
    if (isContentChange) {
      this.updateAllParentsInBreadcrumb(this.getItemParent(rowId));
    }
    return true;
  }

  public getItemField<T>(rowId: Id, key: CollectionItemFieldEnum) {
    return space.getCell('collection', rowId, key) as T;
  }

  public saveItems(
    items: (CollectionItem | CollectionItemUpdate)[],
    parent?: string,
    bulk = false
  ) {
    const allDocIds: string[] = [];
    historyService.disableForBulk(() => {
      items.forEach(item => {
        const id = this.saveItem(item, item.id, parent);
        if (item.type === CollectionItemType.document) {
          allDocIds.push(id);
        }
      });
    });
    if (!bulk) {
      allDocIds.forEach(docId => historyService.addVersion(docId, true));
    }
    return allDocIds;
  }

  public getBreadcrumb(rowId: string, includeAllNotebooks = false) {
    if (!includeAllNotebooks) {
      const breadcrumb = searchAncestryService.getShortBreadcrumb(rowId);
      return breadcrumb.length > 0 ? breadcrumb.split(',') : [];
    }
    return searchAncestryService.getPath(
      rowId,
      space.getTable('collection'),
      includeAllNotebooks,
      true
    );
  }

  private updateAllParentsInBreadcrumb(folder: string) {
    if (folder === ROOT_COLLECTION) {
      return;
    }
    const breadcrumb = this.getBreadcrumb(folder, true);
    space.transaction(() => {
      for (let i = 1; i < breadcrumb.length; i++) {
        space.setCell(this.tableId, breadcrumb[i], 'updated', Date.now());
      }
    });
  }
}

const collectionService = new CollectionService();
export default collectionService;
