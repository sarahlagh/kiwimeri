import { useQueryResults } from '@/core/db/queries-helper';
import fetchAnnotsConflictsQuery from '@/domain/space-merging/queries/fetchAnnotsConflictsQuery';
import fetchItemsConflictsQuery from '@/domain/space-merging/queries/fetchItemsConflictsQuery';

export default function useHasLocalConflicts() {
  const collectionConflicts = useQueryResults(fetchItemsConflictsQuery);
  const annotsConflicts = useQueryResults(fetchAnnotsConflictsQuery);
  return collectionConflicts.length > 0 || annotsConflicts.length > 0;
}
