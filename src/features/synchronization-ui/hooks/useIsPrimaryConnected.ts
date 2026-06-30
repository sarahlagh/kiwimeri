import { useQueryResults } from '@/core/db/queries-helper';
import fetchRemotesQuery from '@/domain/synchronization/replica-state/queries/fetchRemotesQuery';

export default function useIsPrimaryConnected() {
  const remotes = useQueryResults(fetchRemotesQuery);
  const primary = remotes && remotes.length > 0 ? remotes[0] : undefined;
  return primary?.connected || false;
}
