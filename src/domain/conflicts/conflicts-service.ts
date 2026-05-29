import { useQueryResults } from '@/core/db/queries-helper';
import { Id } from 'tinybase/with-schemas';
import { CollectionItemConflictResult, CommentConflictResult } from './model';
import fetchCommentConflictsQuery from './queries/fetchCommentConflictsQuery';
import fetchItemsConflictsQuery from './queries/fetchItemsConflictsQuery';

class ConflictsService {
  public initConflictQueries() {
    fetchItemsConflictsQuery.initQuery();
    fetchCommentConflictsQuery.initQuery();
  }

  public closeConflictQueries() {
    fetchItemsConflictsQuery.close();
    fetchCommentConflictsQuery.close();
  }

  public useHasLocalConflicts() {
    const collectionConflicts = useQueryResults(fetchItemsConflictsQuery);
    const commentConflicts = useQueryResults(fetchCommentConflictsQuery);
    return collectionConflicts.length > 0 || commentConflicts.length > 0;
  }

  public getHasLocalConflicts() {
    const { itemsConflicts, commentConflicts } = this.getConflicts();
    return itemsConflicts.length > 0 || commentConflicts.length > 0;
  }

  public getConflicts() {
    const itemsConflicts = fetchItemsConflictsQuery.getResults({});
    const commentConflicts = fetchCommentConflictsQuery.getResults({});
    return { itemsConflicts, commentConflicts };
  }

  public itemHasConflicts(
    id: Id,
    itemsConflicts?: CollectionItemConflictResult[],
    commentConflicts?: CommentConflictResult[]
  ) {
    if (!itemsConflicts || !commentConflicts) {
      itemsConflicts = fetchItemsConflictsQuery.getResults({});
      commentConflicts = fetchCommentConflictsQuery.getResults({});
    }
    const hasConflict =
      itemsConflicts.filter(c => c.conflict === id).length > 0;
    const hasCommentConflicts =
      commentConflicts.filter(c => c.itemId === id).length > 0;
    return { hasConflict, hasCommentConflicts };
  }
}
export const conflictsService = new ConflictsService();
