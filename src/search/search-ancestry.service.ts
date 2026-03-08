import {
  CollectionItem,
  CollectionItemResult,
  CollectionItemType,
  CollectionItemTypeValues,
  PageResult
} from '@/collection/collection';
import { unminimizeContentFromStorage } from '@/common/wysiwyg/compress-file-content';
import { DEFAULT_SPACE_ID, ROOT_COLLECTION } from '@/constants';
import { useCellWithRef } from '@/db/tinybase/hooks';
import formatConverter from '@/format-conversion/format-converter.service';
import { Id, Ids, Store, Table } from 'tinybase/with-schemas';
import storageService from '../db/storage.service';
import { SpaceType } from '../db/types/space-types';
import { StoreType } from '../db/types/store-types';

class CollectionSearchService {
  private readonly ancestorsTableId = 'ancestors';
  private readonly collectionTableId = 'collection';

  private updateListeners: Map<Id, Ids> = new Map();

  public start(spaceId = DEFAULT_SPACE_ID) {
    const store = storageService.getStore();
    const space = storageService.getSpace(spaceId);
    const indexes = storageService.getStoreIndexes();
    indexes.setIndexDefinition('byParent', 'ancestors', 'parentId', 'depth');
    indexes.setIndexDefinition('byChild', 'ancestors', 'childId', 'depth');

    // on app start backfill tables
    if (
      store.getRowCount('ancestors') === 0 ||
      store.getRowCount('search') === 0
    ) {
      console.log('backfilling ancestry and search tables');
      store.transaction(() => {
        const collectionTable = space.getTable(this.collectionTableId);
        space.getRowIds(this.collectionTableId).forEach(rowId => {
          this.updateAncestry([rowId], collectionTable);
          this.updateContentPreview(rowId, collectionTable, store);
        });
      });
    }

    // update data as user changes stuff
    const onParentChangeListener = this.addParentChangeListener(spaceId, space);
    const onContentChangeListener = this.addContentChangeListener(space);

    this.updateListeners.set(spaceId, [
      onParentChangeListener,
      onContentChangeListener
    ]);
  }

  private addParentChangeListener(spaceId: string, space: Store<SpaceType>) {
    return space.addCellListener(
      this.collectionTableId,
      null,
      'parent',
      (space, tableId, rowId, cellId, newCell, oldCell) => {
        storageService.getStore().transaction(() => {
          const oldParent = oldCell as string;

          const rowChildren = this.getChildren(rowId);
          const updatedItems = [rowId, ...rowChildren];

          // delete all from old path
          this.deleteAncestry(rowId, updatedItems, oldParent, spaceId);

          // add new paths
          if (newCell) {
            const collectionTable = space.getTable(tableId);
            this.updateAncestry(updatedItems, collectionTable);
          }
        });
      }
    );
  }

  private addContentChangeListener(space: Store<SpaceType>) {
    return space.addCellListener(
      this.collectionTableId,
      null,
      'content',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (space, tableId, rowId, cellId, newCell) => {
        this.updateContentPreview(
          rowId,
          space.getTable(tableId),
          storageService.getStore()
        );
      }
    );
  }

  public stop() {
    this.updateListeners.forEach((listenerIds, spaceId) => {
      const space = storageService.getSpace(spaceId);
      listenerIds.forEach(listenerId => {
        space.delListener(listenerId);
      });
    });
  }

  public getShortBreadcrumb(rowId: string) {
    return (
      storageService
        .getStore()
        .getCell('search', rowId, 'breadcrumb')
        ?.toString() || ''
    );
  }

  public getItemPreview(rowId: string) {
    return (
      storageService
        .getStore()
        .getCell('search', rowId, 'contentPreview')
        ?.toString() || ''
    );
  }

  public useItemPreview(rowId: Id) {
    return (
      useCellWithRef<string>('store', 'search', rowId, 'contentPreview') || null
    );
  }

  public getUnsavedItemPreview(item: Pick<CollectionItem, 'content'>) {
    return formatConverter.toPlainText(
      unminimizeContentFromStorage(item.content as string),
      { inline: true }
    );
  }

  public sortPerContentPreview(
    results: CollectionItemResult[],
    descending: boolean
  ): PageResult[] {
    const withPreviews = this.enrichWithPreview(results);
    if (!descending) {
      return withPreviews.sort((i1, i2) =>
        i1.preview.localeCompare(i2.preview)
      );
    }
    return withPreviews.sort((i1, i2) => i2.preview.localeCompare(i1.preview));
  }

  public enrichWithPreview(results: CollectionItemResult[]): PageResult[] {
    const table = storageService.getStore().getTable('search');
    return results.map(row => ({
      ...row,
      preview: table[row.id]?.contentPreview?.toString() || ''
    }));
  }

  public getChildren(rowId: string) {
    return storageService
      .getStoreIndexes()
      .getSliceRowIds('byParent', rowId)
      .map(id => id.split(',')[0]);
  }

  private getParents(rowId: string) {
    return storageService
      .getStoreIndexes()
      .getSliceRowIds('byChild', rowId)
      .map(id => id.split(',')[1]);
  }

  private deleteAncestry(
    rowId: string,
    updatedItems: string[],
    oldParent: string,
    spaceId: string
  ) {
    const store = storageService.getStore();
    const collectionTable = storageService
      .getSpace(spaceId)
      .getTable(this.collectionTableId);
    const rowParents = this.getParents(oldParent);

    updatedItems.forEach(updatedItem => {
      store.delRow(
        this.ancestorsTableId,
        this.getAncestorId(updatedItem, oldParent)
      );

      // if old parent had other parents in breadcrumb, must delete ancestry too
      for (const oldParentOfParent of rowParents) {
        const path = this.getPath(rowId, collectionTable);
        if (path.includes(oldParentOfParent)) {
          break;
        }
        store.delRow(
          this.ancestorsTableId,
          this.getAncestorId(updatedItem, oldParentOfParent)
        );
      }
    });
  }

  private updateAncestry(
    rowIds: string[],
    table: Table<SpaceType[0], 'collection'>
  ) {
    const store = storageService.getStore();

    rowIds.forEach(rowId => {
      // update 'search' info - partial path
      store.setCell(
        'search',
        rowId,
        'breadcrumb',
        this.getPath(rowId, table, false, true).join(',')
      );

      // update ancestors
      const fullPath = this.getPath(rowId, table); // TODO don't call getPath twice
      fullPath.toReversed().forEach((parentId, idx) => {
        const ancestorId = this.getAncestorId(rowId, parentId);
        store.setRow(this.ancestorsTableId, ancestorId, {
          childId: rowId,
          parentId,
          depth: idx
        });
      });
    });
  }

  private updateContentPreview(
    rowId: string,
    table: Table<SpaceType[0], 'collection'>,
    store: Store<StoreType>
  ) {
    if (table[rowId]?.content) {
      store.setCell(
        'search',
        rowId,
        'contentPreview',
        this.getUnsavedItemPreview(table[rowId] as CollectionItem)
      );
    }
  }

  // store path with includeAllNotebooks = false
  // but use path with includeAllNotebooks = true when testing ancestry
  public getPath(
    rowId: string,
    table: Table<SpaceType[0], 'collection'>,
    includeAllNotebooks = true,
    includeSelf = false
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

  private getAncestorId(childId: string, parentId: string) {
    return `${childId},${parentId}`;
  }
}

export const searchAncestryService = new CollectionSearchService();
