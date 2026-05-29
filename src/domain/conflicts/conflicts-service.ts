import { useQueryResults } from '@/core/db/queries-helper';
import { Id } from 'tinybase/with-schemas';
import {
  AnnotationConflictResult,
  CollectionItemConflictResult
} from './model';
import fetchAnnotsConflictsQuery from './queries/fetchAnnotsConflictsQuery';
import fetchItemsConflictsQuery from './queries/fetchItemsConflictsQuery';

class ConflictsService {
  public initConflictQueries() {
    fetchItemsConflictsQuery.initQuery();
    fetchAnnotsConflictsQuery.initQuery();
  }

  public closeConflictQueries() {
    fetchItemsConflictsQuery.close();
    fetchAnnotsConflictsQuery.close();
  }

  public useHasLocalConflicts() {
    const collectionConflicts = useQueryResults(fetchItemsConflictsQuery);
    const annotsConflicts = useQueryResults(fetchAnnotsConflictsQuery);
    return collectionConflicts.length > 0 || annotsConflicts.length > 0;
  }

  public getHasLocalConflicts() {
    const { itemsConflicts, annotsConflicts } = this.getConflicts();
    return itemsConflicts.length > 0 || annotsConflicts.length > 0;
  }

  public getConflicts() {
    const itemsConflicts = fetchItemsConflictsQuery.getResults({});
    const annotsConflicts = fetchAnnotsConflictsQuery.getResults({});
    return { itemsConflicts, annotsConflicts };
  }

  public itemHasConflicts(
    id: Id,
    itemsConflicts?: CollectionItemConflictResult[],
    annotsConflicts?: AnnotationConflictResult[]
  ) {
    if (!itemsConflicts || !annotsConflicts) {
      itemsConflicts = fetchItemsConflictsQuery.getResults({});
      annotsConflicts = fetchAnnotsConflictsQuery.getResults({});
    }
    const hasConflict =
      itemsConflicts.filter(c => c.conflict === id).length > 0;
    const hasAnnotsConflicts =
      annotsConflicts.filter(c => c.itemId === id).length > 0;
    return { hasConflict, hasAnnotsConflicts };
  }
}
export const conflictsService = new ConflictsService();
