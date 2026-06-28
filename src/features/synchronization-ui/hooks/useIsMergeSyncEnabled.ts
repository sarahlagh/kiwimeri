import { useQueryResults } from '@/core/db/queries-helper';
import { conflictsService } from '@/domain/conflicts/conflicts-service';
import fetchRemotesQuery from '@/domain/replication/replica-state/queries/fetchRemotesQuery';

export default function useIsMergeSyncEnabled() {
  const remotes = useQueryResults(fetchRemotesQuery);
  const primary = remotes && remotes.length > 0 ? remotes[0] : undefined;
  const isConnected = primary?.connected || false;
  const hasConflicts = conflictsService.useHasLocalConflicts();
  return isConnected && !hasConflicts;
}
