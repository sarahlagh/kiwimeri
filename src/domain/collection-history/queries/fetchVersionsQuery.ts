import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { WithId } from '@/core/db/types';
import { CollectionItemSnapshotData } from '@/domain/collection/model';
import { Id } from 'tinybase/with-schemas';
import { CollectionItemVersionOp } from '../model';

export type VersionsWithContentQueryParam = {
  itemId?: Id;
};

export type CollectionItemVersion = WithId<{
  id: Id;
  op: CollectionItemVersionOp;
  itemId: string;
  createdAt: number;
  snapshotJson: CollectionItemSnapshotData;
  content: string;
  preview: string;
  hash: Id;
}>;

const fetchVersionsQuery = new SpaceQueryDefinition<
  VersionsWithContentQueryParam,
  CollectionItemVersion,
  SpaceTables.History
>(
  'fetchVersions',
  SpaceTables.History,
  ({ select, where, param, join }) => {
    const params: VersionsWithContentQueryParam = {
      itemId: param('itemId') as string
    };

    select('op');
    select('itemId');
    select('createdAt');
    select('snapshotJson');
    select('contentId').as('hash');
    select('contentData', 'content');
    select('contentData', 'preview');
    join(SpaceTables.HistoryContent, 'contentId').as('contentData');

    if (params.itemId !== undefined) {
      where('itemId', params.itemId);
    }
  },
  'createdAt',
  true
);

export default fetchVersionsQuery;
