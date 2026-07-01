import { useQueryResults } from '@/core/db/queries-helper';
import fetchAnnotsConflictsQuery from '@/domain/synchronization/queries/fetchAnnotsConflictsQuery';
import fetchItemsConflictsQuery from '@/domain/synchronization/queries/fetchItemsConflictsQuery';

export default function useHasLocalConflicts() {
  const collectionConflicts = useQueryResults(fetchItemsConflictsQuery);
  const annotsConflicts = useQueryResults(fetchAnnotsConflictsQuery);
  return collectionConflicts.length > 0 || annotsConflicts.length > 0;
}
