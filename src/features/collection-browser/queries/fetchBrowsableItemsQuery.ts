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
  onlyConflicts?: boolean;
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
      onlyConflicts: param('onlyConflicts') as boolean,
      withPreview: param('withPreview') as boolean,
      withLastOpenedAt: param('withLastOpenedAt') as boolean
    };

    // works but only because stats and collection have same id for global stats
    join(SpaceTables.CollectionItemView, (getCell, itemId) => itemId).as(
      'content'
    );
    join(SpaceTables.ProjectedState, (getCell, itemId) => itemId).as('state');

    select('parentId');
    select('title');
    select('type');
    select('tags');
    select('createdAt');
    select('order');
    select('conflictId');
    if (params.withPreview) {
      select(getCell =>
        getCell('content', 'plainText')
          ?.toString()
          .substring(0, DOC_PREVIEW_SIZE)
      ).as('previewText');
    }
    select('state', 'shortPath').as('breadcrumb');
    select('state', 'updatedAtRank');

    if (params.withLastOpenedAt) {
      select('state', 'lastOpenedAtRank');
    }

    if (params.onlyConflicts) {
      // !! not reactive if conflicts are solved
      const { itemsConflicts, annotsConflicts } =
        conflictsService.getConflicts();
      where(getCell => {
        const id = getCell('itemId')!;
        const isConflict = getCell('conflictId') !== undefined;
        const { hasConflict, hasAnnotsConflicts: hasNoteConflicts } =
          conflictsService.itemHasConflicts(
            id,
            itemsConflicts,
            annotsConflicts
          );
        return isConflict || hasConflict || hasNoteConflicts;
      });
    }

    where(getCell => getCell('itemId') !== params.parentId);
    if (!params.recursive) {
      where('parentId', params.parentId);
    } else if (params.parentId !== ROOT_COLLECTION) {
      where(getCell => {
        const fullPath = getCell('state', 'fullPath') as string[];
        return fullPath?.includes(params.parentId);
      });
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
  }
);

export type FetchBrowsableItemsQuery = typeof fetchBrowsableItemsQuery;
export default fetchBrowsableItemsQuery;
