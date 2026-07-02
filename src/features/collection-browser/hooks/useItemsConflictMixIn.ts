import { useQueryResults } from '@/core/db/queries-helper';
import { conflictsService } from '@/domain/synchronization/conflicts-service';
import fetchAnnotsConflictsQuery from '@/domain/synchronization/queries/fetchAnnotsConflictsQuery';
import { BrowsableItemResult } from '../browsable-item';

export default function useItemsConflictMixIn(items: BrowsableItemResult[]) {
  const annotsConflicts = useQueryResults(fetchAnnotsConflictsQuery);

  return items.map(item => ({
    ...item,
    isConflict: item.conflictId !== undefined,
    hasAnnotsConflicts: conflictsService.itemHasConflicts(
      item.id,
      [],
      annotsConflicts
    ).hasAnnotsConflicts
  }));
}
