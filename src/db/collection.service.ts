import {
  CollectionItem,
  CollectionItemFieldEnum,
  CollectionItemHistorizableFields,
  CollectionItemResetConflictFields,
  CollectionItemResult,
  CollectionItemUpdateChangeFields as CollectionItemRowUpdateChangeFields,
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
import { SpaceTables } from '@/core/db/store-constants';
import { SpaceTablesType } from '@/core/db/store-schema';
import { DbSerializableData, setMetaField, WithId } from '@/core/db/types';
import { settingsService } from '@/domain/collection-settings/collection-settings.service';
import {
  CollectionItemSettings,
  CollectionItemSort
} from '@/domain/collection-settings/model';
import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import { getDerivedId } from '@/domain/derived-content/model';
import { SerializedEditorState } from 'lexical';
import { getUniqueId } from 'tinybase/common';
import { Id, Ids } from 'tinybase/common/with-schemas';
import { Table } from 'tinybase/with-schemas';
import { historyService } from './collection-history.service';
import notebooksService from './notebooks.service';
import { useCellWithRef } from './tinybase/hooks';

export const initialContent = () => {
  // 'empty' editor
  return '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
};

export const INITIAL_CONTENT_START = '{"root":{';

class CollectionService {
  private readonly storeId = 'space';
  private readonly tableId = 'collection';

  private fetchAllPerParentQuery(parent: string) {
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
        }
      );
    }
    return queryName;
  }

  private fetchDocsFoldersNotebooksPerParentQuery(parent: string) {
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

  private getResultsSorted(
    table: Table<SpaceTablesType, never>,
    queryName: string,
    sort: CollectionItemSort
  ) {
    const results = spaceQueries
      .getResultSortedRowIds(queryName, sort.by, sort.descending)
      .map(rowId => {
        const row = table[rowId];
        return { ...row, id: rowId } as CollectionItemResult;
      });
    return results;
  }

  public getCollectionItems(parent: string, sort?: CollectionItemSort) {
    if (!sort) {
      sort = settingsService.getNotebookDefaultSort();
    }
    const table = space.getTable(this.tableId);
    const queryName = this.fetchAllPerParentQuery(parent);
    return this.getResultsSorted(table as never, queryName, sort);
  }

  public getBrowsableCollectionItems(
    parent: string,
    sort?: CollectionItemSort
  ) {
    if (!sort) {
      sort = settingsService.getNotebookDefaultSort();
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

  public getConflicts(sort?: CollectionItemSort) {
    if (!sort) {
      sort = settingsService.getNotebookDefaultSort();
    }
    const table = space.getTable(this.tableId);
    const queryName = this.fetchConflictsQuery();
    return this.getResultsSorted(table as never, queryName, sort);
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
      created: now,
      updated: now,
      type: CollectionItemType.document,
      order: DEFAULT_ORDER, // TODO dynamic order
      order_meta: setMetaField(now, 0)
    };
    return { item, id };
  }

  public addDocument(parent: string) {
    const { item, id } = this.getNewDocumentObj(parent);
    this.saveItem(item, id);
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
      created: now,
      updated: now,
      type: CollectionItemType.folder,
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

  public getDocumentPreview(id: string) {
    return space.getCell(SpaceTables.DerivedContent, id, 'plainText') || '';
  }

  public getItem(id: string) {
    return {
      ...space.getRow(this.tableId, id),
      id
    } as CollectionItem;
  }

  public getAllChildren(parent: string, sort?: CollectionItemSort) {
    if (!sort) {
      sort = settingsService.getNotebookDefaultSort();
    }
    return fetchItemsQuery.getResults(
      {
        parent,
        recursive: true,
        onlyDocuments: false,
        onlyConflicts: false
      },
      sort.by,
      sort.descending
    );
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
    space.transaction(() => {
      space.delRow(this.tableId, rowId);
      space.delRow(SpaceTables.DerivedState, rowId);
      space.delRow(SpaceTables.DerivedContent, getDerivedId('c', rowId));
    });
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

  public setItemSettings(rowId: Id, settings: CollectionItemSettings) {
    this.setItemField(rowId, 'settings', settings);
  }

  public reorderItems(
    items: SortableCollectionItem[],
    from: number,
    to: number
  ) {
    space.transaction(() => {
      genericReorder(from, to, (idx, order) => {
        this.setItemField(items[idx].id, 'order', order, true);
      });
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
    return new Set<string>(
      space.getCell(this.tableId, rowId, 'tags') as string[]
    );
  }

  public addItemTag(rowId: Id, tag: string) {
    const tags = this.getItemTags(rowId);
    tags.add(tag);
    this.setItemField(rowId, 'tags', [...tags]);
  }

  public addItemTags(rowId: Id, tags: string[]) {
    const currentTags = this.getItemTags(rowId);
    tags.forEach(tag => {
      currentTags.add(tag);
    });
    this.setItemField(rowId, 'tags', [...currentTags]);
  }

  public setItemTags(rowId: Id, tags: string[]) {
    this.setItemField(rowId, 'tags', [...tags]);
  }

  public delItemTag(rowId: Id, tag: string) {
    const tags = this.getItemTags(rowId);
    tags.delete(tag);
    this.setItemField(rowId, 'tags', [...tags]);
  }

  public renameItemTag(rowId: Id, tag1: string, tag2: string) {
    const tags = this.getItemTags(rowId);
    tags.delete(tag1);
    tags.add(tag2);
    this.setItemField(rowId, 'tags', [...tags]);
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
    // title and content are real changes, order and settings are not (won't trigger an update ts)
    const isContentChange = this.shouldTriggerRowUpdatedChange(key);
    const isParentChange = key === 'parent';
    space.transaction(() => {
      space.setCell(SpaceTables.Collection, rowId, key, value as never);
      space.setCell(
        'collection',
        rowId,
        `${key}_meta`,
        setMetaField(updated, `${value}`)
      );

      if (isContentChange) {
        space.setCell(SpaceTables.Collection, rowId, 'updated', updated);
      }

      if (!skipVersion && this.isHistorizableContentChange(type, key)) {
        historyService.addVersion(rowId);
      }

      if (CollectionItemResetConflictFields.includes(key)) {
        this.resetItemIfConflict(rowId);
      }

      if (isParentChange) {
        const tmpTable = space.getTable(SpaceTables.Collection);
        tmpTable[rowId].parent = value as string;
        this.propagateBreadcrumbChange(rowId, tmpTable);
      }
    });
    if (isContentChange) {
      this.updateAllParentsInBreadcrumb(this.getItemParent(rowId));
    }
    return true;
  }

  private propagateBreadcrumbChange(
    parent: string,
    tmpTable: Table<SpaceTablesType, SpaceTables.Collection>
  ) {
    this.calcState(parent, tmpTable);
    // if has children, update their breadcrumbs too
    const stateTable = space.getTable(SpaceTables.DerivedState);
    Object.keys(stateTable).forEach(rowId => {
      const state = stateTable[rowId];
      if (state.fullPath?.includes(parent)) {
        this.calcState(rowId, tmpTable);
      }
    });
  }

  public getItemField<T>(rowId: Id, key: CollectionItemFieldEnum) {
    return space.getCell('collection', rowId, key) as T;
  }

  private getPath(
    rowId: string,
    table: Table<SpaceTablesType, SpaceTables.Collection>,
    includeAllNotebooks = true,
    includeSelf = false // TODO always true
  ) {
    let parent = rowId;
    let breadcrumb: string[] = [];
    let nbNotebooks = 0;
    while (parent !== ROOT_COLLECTION && nbNotebooks < 2) {
      if (!table[parent]) {
        break;
      }
      if (parent !== rowId || includeSelf) {
        breadcrumb = [parent, ...breadcrumb];
      }
      const parentType = table[parent].type as CollectionItemTypeValues;
      if (!includeAllNotebooks && parentType === CollectionItemType.notebook) {
        nbNotebooks++;
        break;
      }
      const parentParent = (table[parent].parent as string) || ROOT_COLLECTION;
      if (parentParent === parent && parent !== ROOT_COLLECTION) {
        throw new Error('circular parent reference');
      }
      parent = parentParent;
    }
    return breadcrumb;
  }

  private getPaths(
    rowId: string,
    table: Table<SpaceTablesType, SpaceTables.Collection>
  ) {
    let fullPath: string[] = [];
    let shortPath: string[] = [];
    let parent = rowId;
    let nbNotebooks = 0;
    while (parent !== ROOT_COLLECTION) {
      if (!table[parent]) {
        break;
      }
      fullPath = [parent, ...fullPath];
      const parentType = table[parent].type as CollectionItemTypeValues;
      if (parentType !== CollectionItemType.notebook || ++nbNotebooks < 2) {
        shortPath = [parent, ...shortPath];
      }
      const parentParent = (table[parent].parent as string) || ROOT_COLLECTION;
      if (fullPath.includes(parentParent) && parent !== ROOT_COLLECTION) {
        throw new Error('circular parent reference');
      }
      parent = parentParent;
    }

    return { fullPath, shortPath };
  }

  public calcState(
    id: Id,
    table: Table<SpaceTablesType, SpaceTables.Collection>
  ) {
    const { fullPath, shortPath } = this.getPaths(id, table);
    space.setPartialRow(SpaceTables.DerivedState, id, {
      fullPath,
      shortPath
    });
  }

  private getTempTable(item: WithId<CollectionItem>) {
    const tmpTable = space.getTable(SpaceTables.Collection);
    tmpTable[item.id] = item;
    return tmpTable;
  }

  public saveItem(item: CollectionItem, id?: string) {
    if (!id) {
      id = getUniqueId();
    }
    space.transaction(() => {
      const row = { ...item, itemId: id } as CollectionItem;
      this.calcState(id, this.getTempTable({ ...row, id }));
      space.setRow(SpaceTables.Collection, id, row);
      this.updateAllParentsInBreadcrumb(item.parent);
    });

    // TODO not sure why transaction breaks addVersionFromItem here - try startTransaction / endTransaction instead?
    // TODO should probably check if a relevant field has been updated here
    if (isDocument(item)) {
      historyService.saveVersionFromItem({ ...item, id } as CollectionItem);
    }
    return id;
  }

  public saveItems(
    items: (CollectionItem | CollectionItemUpdate)[],
    bulk = false
  ) {
    const tmpTable = space.getTable(SpaceTables.Collection);
    const allDocIds: string[] = [];
    const allIds: string[] = [];
    space.transaction(() => {
      items.forEach(item => {
        const id = item.id || getUniqueId();
        const oldRow = tmpTable[id];
        const newRow = { ...oldRow, ...item, itemId: id } as CollectionItem;
        tmpTable[id] = newRow;
        allIds.push(id);
        if (item.type === CollectionItemType.document) {
          allDocIds.push(id);
        }
        space.setRow(SpaceTables.Collection, id, newRow);
      });
      // can probably optimize
      allIds.forEach(rowId => this.calcState(rowId, tmpTable));

      // backfill all for now- should optimize
      Object.keys(tmpTable).forEach(rowId => {
        this.calcState(rowId, tmpTable);
      });
    });
    if (!bulk) {
      allDocIds.forEach(docId => historyService.addVersion(docId, true));
    }
    return allDocIds;
  }

  public backfillDerivedStates(
    tmpTable?: Table<SpaceTablesType, SpaceTables.Collection>,
    rowIds?: Ids
  ) {
    if (!tmpTable) tmpTable = space.getTable(SpaceTables.Collection);
    if (!rowIds) rowIds = Object.keys(tmpTable);
    space.transaction(() => {
      rowIds.forEach(rowId => {
        this.calcState(rowId, tmpTable);
      });
    });
  }

  public getBreadcrumb(rowId: string, includeAllNotebooks = false) {
    const breadcrumb = space.getCell(
      SpaceTables.DerivedState,
      rowId,
      includeAllNotebooks ? 'fullPath' : 'shortPath'
    );
    if (breadcrumb) return breadcrumb as string[];
    return [];
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
