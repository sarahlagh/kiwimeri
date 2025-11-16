import { unminimizeContentFromStorage } from '@/common/wysiwyg/compress-file-content';
import { ROOT_COLLECTION } from '@/constants';
import formatConverter from '@/format-conversion/format-converter.service';
import { Id, Store, Table } from 'tinybase/with-schemas';
import storageService from './storage.service';
import { SpaceType } from './types/space-types';
import { StoreType } from './types/store-types';

class CollectionSearchService {
  private readonly ancestorsTableId = 'ancestors';
  private readonly collectionTableId = 'collection';

  private ancestryUpdateListeners: Map<Id, Id> = new Map();

  public initSearchIndices(spaceId: string) {
    const store = storageService.getStore();
    const space = storageService.getSpace(spaceId);
    const indexes = storageService.getStoreIndexes();
    indexes.setIndexDefinition('byParent', 'ancestors', 'parentId', 'depth');
    indexes.setIndexDefinition('byChild', 'ancestors', 'childId', 'depth');

    // on app start backfill tables
    store.transaction(() => {
      const collectionTable = space.getTable(this.collectionTableId);
      space.getRowIds(this.collectionTableId).forEach(rowId => {
        this.updateAncestry([rowId], collectionTable);
        this.updateContentPreview(rowId, collectionTable, store);
      });
    });

    // update data as user changes stuff
    const listenerId = space.addCellListener(
      this.collectionTableId,
      null,
      'parent',
      (space, tableId, rowId, cellId, newCell, oldCell) => {
        storageService.getStore().transaction(() => {
          const oldParent = oldCell as string;

          const rowChildren = indexes
            .getSliceRowIds('byParent', rowId)
            .map(id => id.split(',')[0]);
          const updatedItems = [rowId, ...rowChildren];

          // delete all from old path
          this.deleteAncestry(rowId, updatedItems, oldParent, spaceId);

          // add new paths
          if (newCell) {
            const collectionTable = space.getTable(this.collectionTableId);
            this.updateAncestry(updatedItems, collectionTable);
          }
        });
      }
    );
    this.ancestryUpdateListeners.set(spaceId, listenerId);
  }

  public stop() {
    this.ancestryUpdateListeners.forEach((listenerId, spaceId) => {
      const space = storageService.getSpace(spaceId);
      space.delListener(listenerId);
    });
  }

  public getBreadcrumb(rowId: string) {
    return storageService.getStore().getCell('search', rowId, 'path');
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
    const indexes = storageService.getStoreIndexes();
    const rowParents = indexes
      .getSliceRowIds('byChild', oldParent)
      .map(id => id.split(',')[1]);

    updatedItems.forEach(updatedItem => {
      store.delRow(this.ancestorsTableId, this.getId(updatedItem, oldParent));

      // if old parent had other parents in breadcrumb, must delete ancestry too
      for (const oldParentOfParent of rowParents) {
        const path = this.getPath(rowId, collectionTable);
        if (path.includes(oldParentOfParent)) {
          break;
        }
        store.delRow(
          this.ancestorsTableId,
          this.getId(updatedItem, oldParentOfParent)
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
      const path = this.getPath(rowId, table);

      // update 'search' info - path and content preview
      store.setCell('search', rowId, 'path', path.join(','));

      // update ancestors
      path.toReversed().forEach((parentId, idx) => {
        const ancestorId = this.getId(rowId, parentId);
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
    if (table[rowId].content) {
      store.setCell(
        'search',
        rowId,
        'contentPreview',
        formatConverter.toPlainText(
          unminimizeContentFromStorage(table[rowId].content as string)
        )
      );
    }
  }

  private getPath(
    rowId: string,
    table: Table<SpaceType[0], 'collection'>
  ): string[] {
    const parent = table[rowId].parent as string;
    if (parent === ROOT_COLLECTION) {
      return [];
    }
    return [...this.getPath(parent, table), parent];
  }

  private getId(childId: string, parentId: string) {
    return `${childId},${parentId}`;
  }
}

export const searchService = new CollectionSearchService();
