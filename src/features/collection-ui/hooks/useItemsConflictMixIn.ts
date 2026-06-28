import { useQueryResults } from '@/core/db/queries-helper';
import { CollectionItemResult } from '@/domain/collection/model';
import { conflictsService } from '@/domain/conflicts/conflicts-service';
import fetchAnnotsConflictsQuery from '@/domain/conflicts/queries/fetchAnnotsConflictsQuery';

export default function useItemsConflictMixIn(items: CollectionItemResult[]) {
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
