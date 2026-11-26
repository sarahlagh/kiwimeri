import { DEFAULT_ORDER, ROOT_COLLECTION, tt } from '@/constants';
import { space, spaceDocContent } from '@/core/db/store';
import { SpaceDocContentTables, SpaceTables } from '@/core/db/store-constants';
import { DbSerializableData, setMetaField } from '@/core/db/types';
import {
  BaseCollectionItem,
  CollectionItem,
  CollectionItemFieldEnum,
  CollectionItemHistorizableFields,
  CollectionItemResetConflictFields,
  CollectionItemRow,
  CollectionItemUpdateChangeFields as CollectionItemRowUpdateChangeFields,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableFieldEnum,
  CollectionItemUpdate,
  isDocument,
  isNotebook,
  isParent,
  SortableCollectionItem
} from '@/domain/collection/collection';
import {
  CollectionItemSettings,
  CollectionItemSort
} from '@/domain/collection/collection-settings';
import { settingsService } from '@/domain/collection/collection-settings.service';
import notebooksService from '@/domain/collection/notebooks.service';
import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import { genericReorder } from '@/shared/dnd/utils';
import { cellEquals } from '@/shared/utils';
import type { SerializedEditorState } from 'lexical';
import { getUniqueId } from 'tinybase/common';
import { Id } from 'tinybase/common/with-schemas';
import { historyService } from '../history/history.service';
import { annotsService } from './doc-annotations.service';
import { ProjectionEngine } from './projection-engine';

export const initialContent = () => {
  // 'empty' editor
  return '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
};

const C = SpaceTables.Collection;
const CC = SpaceDocContentTables.CollectionContent;
const CV = SpaceTables.CollectionItemView;
const P = SpaceTables.ProjectedState;
const CollectionContent = SpaceDocContentTables.CollectionContent;

class CollectionService {
  public getNewDocumentObj(parentId: string) {
    const id = getUniqueId();
    const now = Date.now();
    const content = initialContent();
    const item: BaseCollectionItem = {
      title: tt('newDocTitle'),
      title_meta: setMetaField(now, tt('newDocTitle')),
      parentId,
      parentId_meta: setMetaField(now, parentId),
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

  public addDocument(parentId: string) {
    const { item, id } = this.getNewDocumentObj(parentId);
    this.saveItem(item, id);
    return id;
  }

  public getNewFolderObj(parentId: string) {
    const now = Date.now();
    const id = getUniqueId();
    const item: BaseCollectionItem = {
      title: tt('newFolderTitle'),
      title_meta: setMetaField(now, tt('newFolderTitle')),
      parentId,
      parentId_meta: setMetaField(now, parentId),
      createdAt: now,
      updatedAt: now,
      type: CollectionItemType.folder,
      order: DEFAULT_ORDER, // TODO dynamic order
      order_meta: setMetaField(now, 0)
    };
    return { item, id };
  }

  public addFolder(parentId: string) {
    const { item, id } = this.getNewFolderObj(parentId);
    this.saveItem(item, id);
    return id;
  }

  // for tests
  public addNotebook(parentId: string, title = '') {
    return notebooksService.addNotebook(title, parentId);
  }

  public getDocumentContent(rowId: Id) {
    return spaceDocContent.getCell(CC, rowId, 'content') || '';
  }

  public getDocumentPlainText(id: string) {
    return spaceDocContent.getCell(CollectionContent, id, 'plainText') || '';
  }

  public getDocumentPreview(id: string) {
    return space.getCell(CV, id, 'previewText') || '';
  }

  public getItem(id: string): CollectionItem {
    const row = {
      ...space.getRow(C, id),
      content: spaceDocContent.getCell(CC, id, 'content'),
      content_meta: spaceDocContent.getCell(CC, id, 'content_meta'),
      id
    };
    delete row.itemId;
    return row as CollectionItem;
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

  public getAllChildrenIds(parent: string, sort?: CollectionItemSort) {
    if (!sort) {
      sort = settingsService.getNotebookDefaultSort();
    }
    return fetchItemsQuery.getResultIds(
      {
        parentId: parent,
        recursive: true
      },
      sort.by,
      sort.descending
    );
  }

  public deleteItem(
    rowId: Id,
    flags?: {
      softDelete?: boolean;
      moveItemsUp?: boolean;
      skipAncestryRecalc?: boolean;
    }
  ) {
    const parentId = this.getItemParent(rowId);
    const itemType = this.getItemType(rowId);
    const wasParent = isParent(itemType);
    const wasDocument = isDocument(itemType);
    if (wasParent) {
      // TODO could optimize by removing the recursivity here
      const children = this.getBrowsableCollectionItems(rowId);
      console.debug(`item to delete had ${children.length} children`);
      if (children.length > 0) {
        children.forEach(child => {
          if (flags?.moveItemsUp !== true) {
            this.deleteItem(child.id, { ...flags, skipAncestryRecalc: true });
          } else {
            this.setItemParent(child.id, parentId, {
              skipAncestryRecalc: true
            });
          }
        });
      }
    }
    if (wasDocument) {
      if (flags?.softDelete !== false) {
        // restore should be able to restore deleted annotations too
        // so don't delete annotations here, gc later
        historyService.saveDeleteVersion(rowId);
      } else {
        annotsService.deleteAll(rowId);
        historyService.hardDeleteVersions(rowId);
      }
    }
    const projectionEngine = new ProjectionEngine();
    space.transaction(() => {
      projectionEngine.__deleteCollectionItem(rowId);
      if (flags?.skipAncestryRecalc !== true) {
        projectionEngine.__recalcAncestryLastActivityAt(parentId);
      }
    });
  }

  public restoreItem(rowId: Id) {
    const latest = historyService.getLatestVersion(rowId);
    if (!latest || latest.op !== 'deleted') return;
    historyService.restoreDocumentVersion(rowId, latest.id);
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

  public setItemParent(
    rowId: Id,
    parentId: Id,
    flags?: {
      skipAncestryRecalc?: boolean;
    }
  ) {
    this.setItemField(rowId, 'parentId', parentId, flags);
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
    const defaultValue = isItemHomeFolder ? tt('homeTitle') : '';
    return title || defaultValue;
  }

  public setItemTitle(rowId: Id, title: string) {
    this.setItemField(rowId, 'title', title);
  }

  public setItemLexicalContent(
    rowId: Id,
    content: SerializedEditorState,
    skipVersion = false
  ) {
    this.setItemField(rowId, 'content', JSON.stringify(content), {
      skipVersion
    });
  }

  public setUnsavedItemLexicalContent(
    item: Pick<CollectionItem, 'content'>,
    content: SerializedEditorState
  ) {
    item.content = JSON.stringify(content);
  }

  public appendUnsavedLexicalContent(
    itemId: string,
    contentToAppend: SerializedEditorState
  ) {
    if (!this.itemExists(itemId) || !this.getDocumentContent(itemId))
      return contentToAppend;
    const existingContent = JSON.parse(
      this.getDocumentContent(itemId)!
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
        this.setItemField(items[idx].id, 'order', order, { skipVersion: true });
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

  public isDocument(rowId: Id): boolean {
    return isDocument(this.getItemType(rowId));
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

  public shouldTriggerActivityChange(key: string) {
    return CollectionItemRowUpdateChangeFields.includes(
      key as CollectionItemUpdatableFieldEnum
    );
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
    flags?: {
      skipVersion?: boolean;
      skipAncestryRecalc?: boolean;
    }
  ) {
    const oldValue = this.getItemField(rowId, key);
    if (cellEquals(oldValue, value)) {
      console.debug('no change, skipping', rowId, key);
      return false; // don't add unnecessary changes
    }
    const type = this.getItemType(rowId);
    const updatedAt = Date.now();
    // title and content are real changes, order and settings are not (won't trigger an update ts)
    const isRowUpdateChange = this.shouldTriggerActivityChange(key);
    const isParentChange = key === 'parentId';

    const projectionEngine = new ProjectionEngine();
    space.transaction(() => {
      if (key !== 'content') {
        projectionEngine.$setCollectionCell(rowId, key, value);
        projectionEngine.$setCollectionCell(
          rowId,
          `${key}_meta`,
          setMetaField(updatedAt, `${value}`)
        );
      }
      if (isRowUpdateChange) {
        projectionEngine.$setCollectionCell(rowId, 'updatedAt', updatedAt);
        projectionEngine.__updateAncestryLastActivityAt(updatedAt, rowId);
      }

      if (isParentChange) {
        projectionEngine.__propagateBreadcrumbChangesToSelfAndChildren(rowId);
        if (flags?.skipAncestryRecalc !== true) {
          // must update ancestry of old and new parent
          projectionEngine.__recalcAncestryLastActivityAt([
            oldValue as string,
            value as string
          ]);
        }
      }

      if (CollectionItemResetConflictFields.includes(key)) {
        this.resetItemIfConflict(rowId);
      }
    });
    if (key === 'content') {
      this.setRawContent(rowId, value as string, updatedAt);
    }
    if (
      flags?.skipVersion !== true &&
      this.isHistorizableContentChange(type, key)
    ) {
      historyService.addVersion(rowId);
    }
    return true;
  }

  public getItemField<T>(rowId: Id, key: CollectionItemFieldEnum) {
    if (key === 'content') return this.getDocumentContent(rowId);
    if (key === 'content_meta')
      return spaceDocContent.getCell(CC, rowId, 'content_meta');
    return space.getCell(C, rowId, key) as T;
  }

  public saveItem(item: BaseCollectionItem, rowId?: string) {
    if (!rowId) {
      rowId = getUniqueId();
    }
    const content = item.content;
    const content_updated = item.content_meta?._u;

    const projectionEngine = new ProjectionEngine();
    space.transaction(() => {
      const row = { ...item, itemId: rowId } as CollectionItemRow;
      projectionEngine.$setCollectionRow(rowId, row);
      projectionEngine.$setAncestryPath(rowId);
      projectionEngine.__updateAncestryLastActivityAt(item.updatedAt, rowId);
    });
    if (content) {
      this.setRawContent(rowId, content, content_updated || 0);
    }

    // TODO not sure why transaction breaks addVersionFromItem here - try startTransaction / endTransaction instead?
    // TODO should probably check if a relevant field has been updated here
    if (isDocument(item)) {
      historyService.saveVersionFromItem({
        ...item,
        id: rowId
      } as CollectionItem);
    }
    return rowId;
  }

  public saveItems(
    items: (CollectionItem | CollectionItemUpdate)[],
    bulk = false
  ) {
    const projectionEngine = new ProjectionEngine();
    const allDocs = new Map<string, string>();
    const allIds: string[] = [];
    const now = Date.now();
    space.transaction(() => {
      items.forEach(item => {
        const id = item.id || getUniqueId();
        const oldRow = projectionEngine.$getCollectionRow(id);
        const newRow = { ...oldRow, ...item, itemId: id } as CollectionItemRow;
        projectionEngine.$setCollectionRow(id, newRow);
        allIds.push(id);
        if (item.type === CollectionItemType.document) {
          allDocs.set(id, item.content!);
        }
      });
      // backfill all for now - should optimize
      projectionEngine.__backfillProjectedStates();
      projectionEngine.__updateAllActivityAtBulk();
    });
    spaceDocContent.transaction(() => {
      allDocs.forEach((content, docId) => {
        if (content) {
          this.setRawContent(docId, content, now);
        }
      });
    });
    if (!bulk) {
      allDocs.forEach((content, docId) => {
        historyService.addVersion(docId, true);
      });
    }
    return allDocs.keys();
  }

  public getBreadcrumb(rowId: string, includeAllNotebooks = false) {
    const breadcrumb = space.getCell(
      P,
      rowId,
      includeAllNotebooks ? 'fullPath' : 'shortPath'
    );
    if (breadcrumb) return breadcrumb as string[];
    return [];
  }

  private setRawContent(id: Id, content: string, updated: number) {
    spaceDocContent.setPartialRow(CC, id, {
      content,
      content_meta: setMetaField(updated, content)
    });
  }

  public setLastOpenedAt(itemId: Id, at: number) {
    space.setCell(CV, itemId, 'lastOpenedAt', at);
  }
}

const collectionService = new CollectionService();
export default collectionService;
