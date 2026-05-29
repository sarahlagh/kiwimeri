import { useQueryResults } from '@/core/db/queries-helper';
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
}
export const conflictsService = new ConflictsService();
