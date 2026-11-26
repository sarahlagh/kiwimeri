import { ROOT_COLLECTION } from '@/constants';
import { space, spaceDocContent } from '@/core/db/store';
import { SpaceDocContentTables, SpaceTables } from '@/core/db/store-constants';
import { TableOf } from '@/core/db/types';
import { Id, Ids } from 'tinybase/with-schemas';
import {
  CollectionItemRow,
  CollectionItemType,
  CollectionItemTypeValues,
  isDocument
} from './collection';
import { ProjectedItemStateRow } from './derived-item-state';

const C = SpaceTables.Collection;
const A = SpaceTables.Annotations;
const CC = SpaceDocContentTables.CollectionContent;
const CV = SpaceTables.CollectionItemView;
const ResumeState = SpaceTables.ResumeState;
const P = SpaceTables.ProjectedState;
const AV = SpaceTables.AnnotationView;
const AC = SpaceDocContentTables.AnnotationContent;

export type CollectionTable = TableOf<Partial<CollectionItemRow>>;
export type AnnotationTable = TableOf<Partial<CollectionItemRow>>;
export type ProjectionTable = TableOf<Partial<ProjectedItemStateRow>>;

/** __ prefix indicates the method doesn't create a transaction and must be called inside one
 *   $ prefix indicates the method is an individual action on space
 */
export class ProjectionEngine {
  constructor(
    private _nextCollection = space.getTable(C) as CollectionTable,
    private _nextProjection = space.getTable(P) as ProjectionTable,
    private _nextAnnotation?: AnnotationTable
  ) {}

  public $setCollectionCell(
    rowId: Id,
    key: keyof CollectionItemRow,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
  ) {
    this._nextCollection[rowId][key] = value;
    space.setCell(C, rowId, key, value);
  }

  public $setCollectionRow(rowId: Id, row: CollectionItemRow) {
    this._nextCollection[rowId] = row;
    space.setRow(C, rowId, row);
  }

  public $getCollectionRow(rowId: Id) {
    return this._nextCollection[rowId];
  }

  public $hasAncetryPath(rowId: Id) {
    return this._nextProjection[rowId]?.fullPath !== undefined;
  }

  public $setAncestryPath(id: Id) {
    const { fullPath, nearestNotebookId } = this.computePaths(
      id,
      this._nextCollection
    );
    if (!this._nextProjection[id]) this._nextProjection[id] = {};
    this._nextProjection[id].fullPath = fullPath;
    this._nextProjection[id].nearestNotebookId = nearestNotebookId;
    space.setPartialRow(P, id, {
      fullPath,
      nearestNotebookId
    });
    return { fullPath, nearestNotebookId };
  }

  public __deleteCollectionItem(rowId: Id) {
    this.__cleanupDeletedItem(rowId);
    space.delRow(C, rowId);
  }

  public __cleanupDeletedItem(rowId: Id) {
    delete this._nextCollection[rowId];
    delete this._nextProjection[rowId];
    space.delRow(P, rowId);
    space.delRow(ResumeState, rowId);
    space.delRow(CV, rowId);
    spaceDocContent.delRow(CC, rowId);
  }

  public __deleteAnnot(rowId: Id) {
    if (!this._nextAnnotation) {
      this._nextAnnotation = space.getTable(A) as AnnotationTable;
    }
    delete this._nextAnnotation[rowId];
    space.delRow(A, rowId);
    this.__cleanupDeletedAnnot(rowId);
  }

  public __cleanupDeletedAnnot(rowId: Id) {
    space.delRow(AV, rowId);
    spaceDocContent.delRow(AC, rowId);
  }

  public __backfillProjectedStates(rowIds?: Ids) {
    if (!rowIds) rowIds = Object.keys(this._nextCollection);
    // TODO can optimize by sorting by depth
    // computing top levels first, then taking parent's fullPath + rowId in descendants
    rowIds.forEach(rowId => {
      if (this._nextCollection[rowId].itemId !== rowId) {
        space.setCell(C, rowId, 'itemId', rowId);
      }
      this.$setAncestryPath(rowId);
    });
  }

  public __updateAllActivityAtBulk() {
    if (!this._nextAnnotation) {
      this._nextAnnotation = space.getTable(A) as AnnotationTable;
    }
    const index = this.buildChildrenIndex(this._nextCollection);
    const annotIndex = this.buildChildrenIndex(this._nextAnnotation);
    const rowIds = Object.keys(this._nextCollection);
    rowIds.sort((id1, id2) => {
      const depth1 = this._nextProjection[id1].fullPath?.length || 0;
      const depth2 = this._nextProjection[id2].fullPath?.length || 0;
      return depth2 - depth1;
    });
    // space.startTransaction();
    try {
      rowIds.forEach(rowId => {
        const row = this._nextCollection[rowId];
        let lastActivityAt: number;
        if (isDocument(row.type)) {
          this.__recalcDocumentLastActivityAt(rowId, annotIndex);
        } else {
          const descendants = index.get(rowId) || [];
          lastActivityAt = Math.max(
            ...descendants
              .values()
              .map(
                cId =>
                  this._nextProjection[cId].lastActivityAt ||
                  this._nextCollection[cId].updatedAt ||
                  0
              ),
            row.updatedAt || 0
          );
          this._nextProjection[rowId].lastActivityAt = lastActivityAt;
          space.setCell(P, rowId, 'lastActivityAt', lastActivityAt);
        }
      });
    } finally {
      // space.finishTransaction();
    }
  }

  // TODO optimize
  public __propagateBreadcrumbChangesToSelfAndChildren(id: string) {
    // if has children, update their breadcrumbs too
    Object.keys(this._nextProjection).forEach(rowId => {
      // if (rowId === id) return;
      const state = this._nextProjection[rowId];
      if (state.fullPath?.includes(id)) {
        // is a child
        this.$setAncestryPath(rowId);
      }
    });
  }

  public __updateAncestryLastActivityAt(updatedAt: number, parentId: string) {
    // fullPath includes item itself
    if (parentId === ROOT_COLLECTION) return;
    const fullPath = this._nextProjection[parentId].fullPath;
    if (!fullPath) throw new Error('undefined ancestry: ' + parentId);
    const reversed = fullPath.toReversed();
    for (let i = 0; i < reversed.length; i++) {
      const current = this._nextProjection[reversed[i]].lastActivityAt || 0;
      if (current >= updatedAt) return;
      this._nextProjection[reversed[i]].lastActivityAt = updatedAt;
      space.setCell(P, reversed[i], 'lastActivityAt', updatedAt);
    }
  }

  public __recalcAncestryLastActivityAt(ids: string | string[]) {
    const index = this.buildChildrenIndex(this._nextCollection);
    const allIds = Array.isArray(ids) ? ids : [ids];
    allIds.forEach(id => {
      if (id === ROOT_COLLECTION) return;
      const fullPath = this._nextProjection[id]?.fullPath?.toReversed();
      if (!fullPath) throw Error('undefined ancestry: ' + id);
      for (const parentId of fullPath) {
        const descendants = index.get(parentId) || [];
        const lastActivityAt = Math.max(
          ...descendants
            .values()
            .map(
              cId =>
                this._nextProjection[cId].lastActivityAt ||
                this._nextCollection[cId].updatedAt ||
                0
            ),
          this._nextCollection[parentId].updatedAt || 0
        );
        this._nextProjection[parentId].lastActivityAt = lastActivityAt;
        space.setCell(P, parentId, 'lastActivityAt', lastActivityAt);
      }
    });
  }

  public __recalcDocumentLastActivityAt(
    rowId: string,
    annotIndex?: Map<string, Set<string>>
  ) {
    if (!this._nextAnnotation) {
      this._nextAnnotation = space.getTable(A) as AnnotationTable;
    }
    if (!annotIndex) annotIndex = this.buildChildrenIndex(this._nextAnnotation);
    const annots = annotIndex.get(rowId) || [];
    const row = this._nextCollection[rowId];
    this._nextProjection[rowId].lastActivityAt = Math.max(
      ...annots.values().map(aId => this._nextAnnotation![aId].updatedAt || 0),
      row.updatedAt || 0
    );
    space.setCell(
      P,
      rowId,
      'lastActivityAt',
      this._nextProjection[rowId].lastActivityAt
    );
  }

  private buildChildrenIndex(
    nextCollection: CollectionTable | AnnotationTable
  ) {
    const index = new Map<Id, Set<Id>>();
    Object.keys(nextCollection).forEach(rowId => {
      const parentId = nextCollection[rowId].parentId || '';
      if (!index.has(parentId)) index.set(parentId, new Set());
      index.get(parentId)?.add(rowId);
    });
    return index;
  }

  private computePaths(rowId: string, nextCollection: CollectionTable) {
    let fullPath: string[] = [];
    let nearestNotebookId: string | undefined = undefined;
    let parentId = rowId;
    while (parentId !== ROOT_COLLECTION) {
      if (!nextCollection[parentId]) {
        break;
      }
      fullPath = [parentId, ...fullPath];
      const parentType = nextCollection[parentId]
        .type as CollectionItemTypeValues;
      if (parentType === CollectionItemType.notebook && !nearestNotebookId) {
        nearestNotebookId = parentId;
      }
      const parentParent =
        (nextCollection[parentId].parentId as string) || ROOT_COLLECTION;
      if (fullPath.includes(parentParent) && parentId !== ROOT_COLLECTION) {
        throw new Error('circular parent reference: ' + rowId);
      }
      parentId = parentParent;
    }
    if (!nearestNotebookId) {
      throw new Error("couln't find nearestNotebookId: " + rowId);
    }
    return { fullPath, nearestNotebookId };
  }
}
