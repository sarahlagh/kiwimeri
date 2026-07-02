import {
  DEFAULT_ORDER,
  DOC_PREVIEW_SIZE,
  getGlobalTrans,
  ROOT_COLLECTION
} from '@/constants';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { SpaceTableId, SpaceTablesType } from '@/core/db/store-schema';
import { DbSerializableData, setMetaField, WithId } from '@/core/db/types';
import {
  CollectionItem,
  CollectionItemFieldEnum,
  CollectionItemHistorizableFields,
  CollectionItemResetConflictFields,
  CollectionItemUpdateChangeFields as CollectionItemRowUpdateChangeFields,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableFieldEnum,
  CollectionItemUpdate,
  isDocument,
  isFolder,
  isNotebook,
  SortableCollectionItem
} from '@/domain/collection/collection';
import {
  CollectionItemSettings,
  CollectionItemSort
} from '@/domain/collection/collection-settings';
import { settingsService } from '@/domain/collection/collection-settings.service';
import {
  minimizeContentForStorage,
  unminimizeContentFromStorage
} from '@/domain/collection/compress-file-content';
import { getDerivedId } from '@/domain/collection/derived-content';
import notebooksService from '@/domain/collection/notebooks.service';
import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import { genericReorder } from '@/shared/dnd/utils';
import { cellEquals } from '@/shared/utils';
import { SerializedEditorState } from 'lexical';
import { getUniqueId } from 'tinybase/common';
import { Id, Ids } from 'tinybase/common/with-schemas';
import { Table } from 'tinybase/with-schemas';
import { historyService } from '../history/history.service';

export const initialContent = () => {
  // 'empty' editor
  return '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
};

export const INITIAL_CONTENT_START = '{"root":{';

const C = SpaceTables.Collection;

class CollectionService {
  public getNewDocumentObj(parent: string) {
    const id = getUniqueId();
    const now = Date.now();
    const content = initialContent();
    const item: CollectionItem = {
      itemId: id,
      title: getGlobalTrans().newDocTitle,
      title_meta: setMetaField(now, getGlobalTrans().newDocTitle),
      parentId: parent,
      parentId_meta: setMetaField(now, parent),
      content,
      content_meta: setMetaField(now, content),
      createdAt: now,
      updatedAt: now,
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
      parentId: parent,
      parentId_meta: setMetaField(now, parent),
      createdAt: now,
      updatedAt: now,
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
    return (
      space.getCell(SpaceTables.DerivedContent, id, 'plainText') || ''
    ).substring(0, DOC_PREVIEW_SIZE);
  }

  public getItem(id: string) {
    return {
      ...space.getRow(C, id),
      id
    } as CollectionItem;
  }

  public getBrowsableCollectionItems(
    parentId: string,
    sort?: CollectionItemSort
  ) {
    if (!sort) {
      sort = settingsService.getNotebookDefaultSort();
    }
    return fetchItemsQuery.getResults(
      {
        parentId,
        recursive: false
      },
      sort.by,
      sort.descending
    );
  }

  public getAllChildren(parent: string, sort?: CollectionItemSort) {
    if (!sort) {
      sort = settingsService.getNotebookDefaultSort();
    }
    return fetchItemsQuery.getResults(
      {
        parentId: parent,
        recursive: true
      },
      sort.by,
      sort.descending
    );
  }

  public deleteItem(rowId: Id, moveItemsUp = false) {
    const parent = this.getItemParent(rowId);
    const itemType = this.getItemType(rowId);
    const wasFolder = isFolder(itemType);
    const wasDocument = isDocument(itemType);
    this.updateAllParentsInBreadcrumb(parent);
    if (wasFolder) {
      const children = this.getBrowsableCollectionItems(rowId);
      console.debug(`folder to delete had ${children.length} children`);
      if (children.length > 0) {
        children.forEach(child => {
          if (!moveItemsUp) {
            this.deleteItem(child.id, undefined);
          } else {
            this.setItemParent(child.id, parent);
          }
        });
      }
    }
    if (wasDocument) {
      historyService.saveDeleteVersion(rowId);
    }
    space.transaction(() => {
      space.delRow(C, rowId);
      space.delRow(SpaceTables.DerivedState, rowId);
      space.delRow(SpaceTables.DerivedContent, getDerivedId('c', rowId));
    });
  }

  public itemExists(rowId: Id) {
    if (rowId === ROOT_COLLECTION) {
      return true;
    }
    return space.hasRow(C, rowId);
  }

  public getItemParent(rowId: Id) {
    return space.getCell(C, rowId, 'parentId') || ROOT_COLLECTION;
  }

  public setItemParent(rowId: Id, parentId: Id) {
    this.setItemField(rowId, 'parentId', parentId);
  }

  public getItemTitle(rowId: Id) {
    const parentId = this.getItemParent(rowId);
    return this.getItemTitleOrDefault(
      parentId,
      space.getCell(C, rowId, 'title')
    );
  }

  public getItemTitleOrDefault(parentId: Id, title?: string) {
    const parentType = this.getItemType(parentId);
    const isItemHomeFolder = isNotebook(parentType);
    const defaultValue = isItemHomeFolder ? getGlobalTrans().homeTitle : '';
    return title || defaultValue;
  }

  public setItemTitle(rowId: Id, title: string) {
    this.setItemField(rowId, 'title', title);
  }

  public getItemContent(rowId: Id) {
    return space.getCell(C, rowId, 'content') || null;
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

  public getItemTags(rowId: Id) {
    return new Set<string>(space.getCell(C, rowId, 'tags') as string[]);
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
    return space.getCell(C, rowId, 'type') as CollectionItemTypeValues;
  }

  public isItemConflict(rowId: Id) {
    return space.getCell(C, rowId, 'conflictId') !== undefined;
  }

  private resetItemIfConflict(rowId: Id) {
    const isConflict = this.isItemConflict(rowId);
    if (isConflict) {
      space.delCell(C, rowId, 'conflictId');
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
    const isParentChange = key === 'parentId';
    space.transaction(() => {
      space.setCell(SpaceTables.Collection, rowId, key, value as never);
      space.setCell(
        'collection',
        rowId,
        `${key}_meta`,
        setMetaField(updated, `${value}`)
      );

      if (isContentChange) {
        space.setCell(SpaceTables.Collection, rowId, 'updatedAt', updated);
      }

      if (!skipVersion && this.isHistorizableContentChange(type, key)) {
        historyService.addVersion(rowId);
      }

      if (CollectionItemResetConflictFields.includes(key)) {
        this.resetItemIfConflict(rowId);
      }

      if (isParentChange) {
        const tmpTable = space.getTable(SpaceTables.Collection);
        tmpTable[rowId].parentId = value as string;
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

  private getPaths(
    rowId: string,
    table: Table<SpaceTablesType, SpaceTables.Collection>
  ) {
    let fullPath: string[] = [];
    let shortPath: string[] = [];
    let parentId = rowId;
    let nbNotebooks = 0;
    while (parentId !== ROOT_COLLECTION) {
      if (!table[parentId]) {
        break;
      }
      fullPath = [parentId, ...fullPath];
      const parentType = table[parentId].type as CollectionItemTypeValues;
      if (parentType !== CollectionItemType.notebook || ++nbNotebooks < 2) {
        shortPath = [parentId, ...shortPath];
      }
      const parentParent =
        (table[parentId].parentId as string) || ROOT_COLLECTION;
      if (fullPath.includes(parentParent) && parentId !== ROOT_COLLECTION) {
        throw new Error('circular parent reference');
      }
      parentId = parentParent;
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
      this.updateAllParentsInBreadcrumb(item.parentId);
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

  public cleanupDerivedState(rowId: string, on: SpaceTableId) {
    if (on === SpaceTables.Collection) {
      space.delRow(SpaceTables.DerivedState, rowId);
      space.delRow(SpaceTables.DerivedContent, getDerivedId('c', rowId));
    }
    if (on === SpaceTables.Annotations) {
      space.delRow(SpaceTables.DerivedContent, getDerivedId('a', rowId));
    }
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
        space.setCell(C, breadcrumb[i], 'updatedAt', Date.now());
      }
    });
  }
}

const collectionService = new CollectionService();
export default collectionService;
