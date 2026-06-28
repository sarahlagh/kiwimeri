import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { ConnectedRemote } from '@/domain/replication/replica-state/model';

export type FetchRemotesQueryParam = {
  connected?: boolean;
};
const fetchRemotesQuery = new SpaceQueryDefinition<
  FetchRemotesQueryParam,
  ConnectedRemote,
  SpaceTables.Remote
>(
  'fetchRemotes',
  SpaceTables.Remote,
  ({ select, where, param, join }) => {
    const params: FetchRemotesQueryParam = {
      connected: param('connected') as boolean
    };
    join(SpaceTables.ReplicaState, (getCell, itemId) => itemId).as('state');
    select('name');
    select('rank');
    select('config');
    select('driver');
    select('state', 'connected');
    if (params.connected !== undefined)
      where('state', 'connected', params.connected);
  },
  'rank'
);

export default fetchRemotesQuery;
