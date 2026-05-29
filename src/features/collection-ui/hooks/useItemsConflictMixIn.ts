import { CollectionItemResult } from '@/collection/collection';
import { useQueryResults } from '@/core/db/queries-helper';
import fetchCommentConflictsQuery from '@/domain/conflicts/queries/fetchCommentConflictsQuery';

export default function useItemsConflictMixIn(items: CollectionItemResult[]) {
  const commentConflicts = useQueryResults(fetchCommentConflictsQuery);

  return items.map(item => ({
    ...item,
    isConflict: item.conflict !== undefined,
    hasCommentConflicts:
      commentConflicts.filter(c => c.itemId === item.id).length > 0
  }));
}
