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
const CC = SpaceDocContentTables.CollectionContent;
const CV = SpaceTables.CollectionItemView;
const ResumeState = SpaceTables.ResumeState;
const ProjectedState = SpaceTables.ProjectedState;

export type CollectionTable = TableOf<Partial<CollectionItemRow>>;
export type ProjectionTable = TableOf<Partial<ProjectedItemStateRow>>;

/** __ prefix indicates the method doesn't create a transaction and must be called inside one */
class CollectionProjectionService {
  private buildChildrenIndex(nextCollection: CollectionTable) {
    const index = new Map<Id, Set<Id>>();
    Object.keys(nextCollection).forEach(rowId => {
      const parentId = nextCollection[rowId].parentId || '';
      if (!index.has(parentId)) index.set(parentId, new Set());
      index.get(parentId)?.add(rowId);
    });
    return index;
  }

  public cleanupDeletedItem(rowId: Id) {
    space.delRow(ProjectedState, rowId);
    space.delRow(ResumeState, rowId);
    space.delRow(CV, rowId);
    spaceDocContent.delRow(CC, rowId);
  }

  private computePaths(rowId: string, nextCollection: CollectionTable) {
    let fullPath: string[] = [];
    let shortPath: string[] = [];
    let parentId = rowId;
    let nbNotebooks = 0;
    while (parentId !== ROOT_COLLECTION) {
      if (!nextCollection[parentId]) {
        break;
      }
      fullPath = [parentId, ...fullPath];
      const parentType = nextCollection[parentId]
        .type as CollectionItemTypeValues;
      if (parentType !== CollectionItemType.notebook || ++nbNotebooks < 2) {
        shortPath = [parentId, ...shortPath];
      }
      const parentParent =
        (nextCollection[parentId].parentId as string) || ROOT_COLLECTION;
      if (fullPath.includes(parentParent) && parentId !== ROOT_COLLECTION) {
        throw new Error('circular parent reference');
      }
      parentId = parentParent;
    }

    return { fullPath, shortPath };
  }

  public __fillInBreadcrumbs(
    id: Id,
    nextCollection: CollectionTable,
    nextProjection: ProjectionTable
  ) {
    const { fullPath, shortPath } = this.computePaths(id, nextCollection);
    space.setPartialRow(ProjectedState, id, {
      fullPath,
      shortPath
    });
    if (!nextProjection[id]) nextProjection[id] = {};
    nextProjection[id].fullPath = fullPath;
    nextProjection[id].shortPath = shortPath;
    return { fullPath, shortPath };
  }

  // TODO can optimize
  public __propagateBreadcrumbChangesToSelfAndChildren(
    id: string,
    nextCollection: CollectionTable,
    nextProjection: ProjectionTable
  ) {
    // this.fillInBreadcrumbs(id, nextCollection, nextProjection);
    // if has children, update their breadcrumbs too
    Object.keys(nextProjection).forEach(rowId => {
      // if (rowId === id) return;
      const state = nextProjection[rowId];
      if (state.fullPath?.includes(id)) {
        // is a child
        this.__fillInBreadcrumbs(rowId, nextCollection, nextProjection);
      }
    });
  }

  public backfillProjectedStates(
    nextCollection: CollectionTable,
    nextProjection: ProjectionTable,
    rowIds?: Ids
  ) {
    if (!rowIds) rowIds = Object.keys(nextCollection);
    // TODO can optimize by sorting by depth
    // computing top levels first, then taking parent's breadcrumb + rowId in descendants
    space.transaction(() => {
      rowIds.forEach(rowId => {
        if (nextCollection[rowId].itemId !== rowId) {
          space.setCell(C, rowId, 'itemId', rowId);
        }
        projectionEngine.__fillInBreadcrumbs(
          rowId,
          nextCollection,
          nextProjection
        );
      });
    });
  }

  public __updateAncestryLastActivityAt(
    updatedAt: number,
    breadcrumb: string[]
  ) {
    // breadcrumb includes item itself
    for (let i = 0; i < breadcrumb.length; i++) {
      space.setCell(ProjectedState, breadcrumb[i], 'lastActivityAt', updatedAt);
    }
  }

  public __recalcAncestryLastActivityAt(
    ids: string | string[],
    nextCollection: CollectionTable,
    nextProjection: ProjectionTable
  ) {
    const index = this.buildChildrenIndex(nextCollection);
    const allIds = Array.isArray(ids) ? ids : [ids];
    allIds.forEach(id => {
      const breadcrumb = nextProjection[id]?.fullPath?.toReversed();
      if (!breadcrumb) throw Error('undefined ancestry: ' + id);
      breadcrumb.forEach(rowId => {
        const descendants = index.get(rowId) || [];
        const lastActivityAt = Math.max(
          ...descendants
            .values()
            .map(
              cId =>
                nextProjection[cId].lastActivityAt ||
                nextCollection[cId].updatedAt ||
                0
            ),
          nextCollection[rowId].updatedAt || 0
        );
        nextProjection[rowId].lastActivityAt = lastActivityAt;
        space.setCell(ProjectedState, rowId, 'lastActivityAt', lastActivityAt);
      });
    });
  }

  public updateAllActivityAtBulk(
    items: { id: string; updatedAt: number; oldParentId?: string }[],
    nextCollection: CollectionTable,
    nextProjection: ProjectionTable
  ) {
    const index = this.buildChildrenIndex(nextCollection);
    const rowIds = Object.keys(nextCollection);
    rowIds.sort((id1, id2) => {
      const depth1 = nextProjection[id1].fullPath?.length || 0;
      const depth2 = nextProjection[id2].fullPath?.length || 0;
      return depth2 - depth1;
    });
    rowIds.forEach(rowId => {
      const row = nextCollection[rowId];
      let lastActivityAt: number;
      if (isDocument(row.type)) {
        lastActivityAt = row.updatedAt || 0;
      } else {
        const descendants = index.get(rowId) || [];
        lastActivityAt = Math.max(
          ...descendants
            .values()
            .map(
              cId =>
                nextProjection[cId].lastActivityAt ||
                nextCollection[cId].updatedAt ||
                0
            ),
          row.updatedAt || 0
        );
      }
      nextProjection[rowId].lastActivityAt = lastActivityAt;
      space.setCell(ProjectedState, rowId, 'lastActivityAt', lastActivityAt);
    });
  }
}

export const projectionEngine = new CollectionProjectionService();
