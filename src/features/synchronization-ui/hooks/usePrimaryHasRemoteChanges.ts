import { useQueryResults } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import fetchRemotesQuery from '@/domain/synchronization/queries/fetchRemotesQuery';
import { ReplicaStateRow } from '@/domain/synchronization/replica-state';

export default function usePrimaryHasRemoteChanges() {
  const remotes = useQueryResults(fetchRemotesQuery);
  const primary = remotes && remotes.length > 0 ? remotes[0] : undefined;
  const collectionInfo = useSpaceCell<
    SpaceTables.ReplicaState,
    'collectionInfo'
  >(
    SpaceTables.ReplicaState,
    primary?.id || '-1',
    'collectionInfo'
  ) as ReplicaStateRow['collectionInfo'];
  if (!primary) return false;
  const lastPulled = collectionInfo?.lastPulled || 0;
  const lastRemoteChange = collectionInfo?.lastRemoteChange || 0;
  return lastPulled < lastRemoteChange;
}
