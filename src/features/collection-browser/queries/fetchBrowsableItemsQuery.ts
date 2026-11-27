import { DOC_PREVIEW_SIZE, ROOT_COLLECTION } from '@/constants';
import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { CollectionItemTypeValues } from '@/domain/collection/collection';
import { conflictsService } from '@/domain/space-merging/conflicts.service';
import { BrowsableItemResult } from '../browsable-item';

export type fetchBrowsableItemsQueryParam = {
  parentId: string;
  recursive?: boolean;
  restrictType?: CollectionItemTypeValues;
  restrictTypes?: CollectionItemTypeValues[];
  itemsConflicts?: string[];
  annotsConflicts?: string[];
  withPreview?: boolean;
  withLastOpenedAt?: boolean;
};

const fetchBrowsableItemsQuery = new SpaceQueryDefinition<
  fetchBrowsableItemsQueryParam,
  BrowsableItemResult,
  SpaceTables.Collection
>(
  'fetchBrowserItems',
  SpaceTables.Collection,
  ({ select, where, param, join }) => {
    const params: fetchBrowsableItemsQueryParam = {
      parentId: param('parentId') as string,
      recursive: param('recursive') as boolean,
      restrictType: param('restrictType') as CollectionItemTypeValues,
      restrictTypes: param('restrictTypes') as CollectionItemTypeValues[],
      itemsConflicts: param('itemsConflicts') as string[],
      annotsConflicts: param('annotsConflicts') as string[],
      withPreview: param('withPreview') as boolean,
      withLastOpenedAt: param('withLastOpenedAt') as boolean
    };
    if (params.recursive === undefined) params.recursive = false;

    join(SpaceTables.CollectionItemView, (getCell, itemId) => itemId).as(
      'view'
    );
    join(SpaceTables.ProjectedState, (getCell, itemId) => itemId).as('state');

    select('parentId');
    select('title');
    select('type');
    select('tags');
    select('createdAt');
    select('state', 'lastActivityAt').as('lastActivityAt');
    select('order');
    select('conflictId');
    if (params.withPreview) {
      select(getCell =>
        getCell('view', 'plainText')?.toString().substring(0, DOC_PREVIEW_SIZE)
      ).as('previewText');
    }

    if (params.withLastOpenedAt) {
      select('view', 'lastOpenedAt');
    }

    if (params.restrictType !== undefined) {
      where('type', params.restrictType);
    }
    if (params.restrictTypes !== undefined) {
      where(getCell =>
        params.restrictTypes!.includes(
          getCell('type') as CollectionItemTypeValues
        )
      );
    }

    if (params.itemsConflicts || params.annotsConflicts) {
      where(getCell => {
        const isConflict = getCell('conflictId') !== undefined;
        if (isConflict) return true;
        const fullPath = getCell('state', 'fullPath') as string[];
        if (!fullPath) return false; // can happen in queries
        const itemId = fullPath[fullPath.length - 1];
        const itemsConflicts = params.itemsConflicts || [];
        const annotsConflicts = params.annotsConflicts || [];
        const { hasConflict, hasAnnotsConflicts: hasNoteConflicts } =
          conflictsService.itemHasConflicts(
            itemId,
            itemsConflicts,
            annotsConflicts
          );
        return hasConflict || hasNoteConflicts;
      });
    }

    if (params.parentId !== ROOT_COLLECTION || !params.recursive) {
      where(getCell => {
        const parentId = getCell('parentId') as string;
        const fullPath = getCell('state', 'fullPath') as string[];
        if (!fullPath) return false; // can happen in queries
        if (fullPath[fullPath.length - 1] === params.parentId) return false; // never return self
        if (!params.recursive) {
          return parentId === params.parentId;
        }
        return fullPath.includes(params.parentId);
      });
    }
  }
);

export type FetchBrowsableItemsQuery = typeof fetchBrowsableItemsQuery;
export default fetchBrowsableItemsQuery;
