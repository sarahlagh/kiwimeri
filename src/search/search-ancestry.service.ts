import {
  CollectionItem,
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { unminimizeContentFromStorage } from '@/common/wysiwyg/compress-file-content';
import { DEFAULT_SPACE_ID, ROOT_COLLECTION } from '@/constants';
import { space, store, storeIndexes } from '@/core/db/store';
import { SID, SpaceTables, StoreTables } from '@/core/db/store-constants';
import { SpaceType } from '@/core/db/store-schema';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { getDerivedId } from '@/domain/derived-content/model';
import formatConverter from '@/format-conversion/format-converter.service';
import { Id, Ids, Store, Table } from 'tinybase/with-schemas';

const C = SpaceTables.Collection;
const AN = StoreTables.Ancestors;

export const getAncestorId = (childId: string, parentId: string) => {
  return `${childId},${parentId}`;
};

class CollectionSearchService {
  private updateListeners: Map<Id, Ids> = new Map();

  public start(spaceId = DEFAULT_SPACE_ID) {
    storeIndexes.setIndexDefinition(
      'byParent',
      'ancestors',
      'parentId',
      'depth'
    );
    storeIndexes.setIndexDefinition('byChild', 'ancestors', 'childId', 'depth');

    // on app start backfill tables
    if (store.getRowCount('ancestors') === 0) {
      console.log('backfilling ancestry and search tables');
      store.transaction(() => {
        space.getRowIds(C).forEach(rowId => {
          this.updateAncestry([rowId]);
        });
      });
    }

    // update data as user changes stuff
    const onParentChangeListener = this.addParentChangeListener(spaceId, space);

    this.updateListeners.set(spaceId, [onParentChangeListener]);
  }

  private addParentChangeListener(spaceId: string, space: Store<SpaceType>) {
    return space.addCellListener(
      C,
      null,
      'parent',
      (space, tableId, rowId, cellId, newCell, oldCell) => {
        store.transaction(() => {
          const oldParent = oldCell as string;

          const rowChildren = this.getChildren(rowId);
          const updatedItems = [rowId, ...rowChildren];

          // delete all from old path
          this.deleteAncestry(rowId, updatedItems, oldParent, spaceId);

          // add new paths
          if (newCell) {
            this.updateAncestry(updatedItems);
          }
        });
      }
    );
  }

  public stop() {
    this.updateListeners.forEach(listenerIds => {
      listenerIds.forEach(listenerId => {
        space.delListener(listenerId);
      });
    });
  }

  /** @deprecated */
  public getItemPreview(rowId: string) {
    return (
      space
        .getCell(
          SpaceTables.DerivedContent,
          getDerivedId('c', rowId),
          'plainText'
        )
        ?.toString() || ''
    );
  }

  /** @deprecated */
  public useItemPreview(rowId: Id) {
    return (
      useSpaceCell<SpaceTables.DerivedContent, 'plainText'>(
        SpaceTables.DerivedContent,
        getDerivedId('c', rowId),
        'plainText',
        SID.space
      ) || null
    );
  }

  public getUnsavedItemPreview(item: Pick<CollectionItem, 'content'>) {
    return formatConverter.toPlainText(
      unminimizeContentFromStorage(item.content as string),
      { inline: true }
    );
  }

  public getChildren(rowId: string) {
    return storeIndexes
      .getSliceRowIds('byParent', rowId)
      .map(id => id.split(',')[0]);
  }

  private getParents(rowId: string) {
    return storeIndexes
      .getSliceRowIds('byChild', rowId)
      .map(id => id.split(',')[1]);
  }

  private deleteAncestry(
    rowId: string,
    updatedItems: string[],
    oldParent: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    spaceId: string
  ) {
    const collectionTable = space.getTable(C);
    const rowParents = this.getParents(oldParent);

    updatedItems.forEach(updatedItem => {
      store.delRow(AN, getAncestorId(updatedItem, oldParent));

      // if old parent had other parents in breadcrumb, must delete ancestry too
      for (const oldParentOfParent of rowParents) {
        const path = this.getPath(rowId, collectionTable);
        if (path.includes(oldParentOfParent)) {
          break;
        }
        store.delRow(AN, getAncestorId(updatedItem, oldParentOfParent));
      }
    });
  }

  private updateAncestry(rowIds: string[]) {
    rowIds.forEach(rowId => {
      const fullPath = space.getCell(
        SpaceTables.DerivedState,
        rowId,
        'fullPath'
      ) as string[];
      fullPath?.pop(); // remove self
      // update ancestors
      fullPath?.toReversed().forEach((parentId, idx) => {
        const ancestorId = getAncestorId(rowId, parentId);
        store.setRow(AN, ancestorId, {
          childId: rowId,
          parentId,
          depth: idx
        });
      });
    });
  }

  // store path with includeAllNotebooks = false
  // but use path with includeAllNotebooks = true when testing ancestry
  private getPath(
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
}

/** @deprecated */
export const searchAncestryService = new CollectionSearchService();
