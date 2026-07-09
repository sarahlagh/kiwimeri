import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { Id } from 'tinybase/with-schemas';
import {
  CollectionItemMetadataVersion,
  CollectionItemVersionOp
} from '../history';

export type VersionsWithContentQueryParam = {
  itemId?: Id;
  op?: CollectionItemVersionOp;
};

const fetchVersionsQuery = new SpaceQueryDefinition<
  VersionsWithContentQueryParam,
  CollectionItemMetadataVersion,
  SpaceTables.History
>(
  'fetchVersions',
  SpaceTables.History,
  ({ select, where, param }) => {
    const params: VersionsWithContentQueryParam = {
      itemId: param('itemId') as string,
      op: param('op') as CollectionItemVersionOp
    };

    select('op');
    select('itemId');
    select('createdAt');
    select('snapshotJson');
    select('contentId').as('hash');

    if (params.itemId !== undefined) {
      where('itemId', params.itemId);
    }
    if (params.op !== undefined) {
      where('op', params.op);
    }
  },
  'createdAt',
  true
);

export default fetchVersionsQuery;
