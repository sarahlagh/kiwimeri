import { Id } from 'tinybase/with-schemas';
import {
  AnnotationConflictResult,
  CollectionItemConflictResult
} from './conflicts';
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

  public getHasLocalConflicts() {
    const { itemsConflicts, annotsConflicts } = this.getConflicts();
    return itemsConflicts.length > 0 || annotsConflicts.length > 0;
  }

  public getConflicts() {
    const itemsConflicts = fetchItemsConflictsQuery.getResults({});
    const annotsConflicts = fetchAnnotsConflictsQuery.getResults({});
    return { itemsConflicts, annotsConflicts };
  }

  public getConflictItemIds() {
    const { itemsConflicts, annotsConflicts } = this.getConflicts();
    return this.conflictsToQueryInputs(itemsConflicts, annotsConflicts);
  }

  public conflictsToQueryInputs(
    itemConflicts: CollectionItemConflictResult[],
    annotConflicts: AnnotationConflictResult[]
  ) {
    return {
      itemsConflicts: itemConflicts.map(c => c.conflictId),
      annotsConflicts: annotConflicts.map(a => a.parentId)
    };
  }

  public itemHasConflicts(
    id: Id,
    conflictIds: string[],
    conflictsIdsFromAnnots: string[]
  ) {
    const hasConflict = conflictIds.filter(c => c === id).length > 0;
    const hasAnnotsConflicts =
      conflictsIdsFromAnnots.filter(c => c === id).length > 0;
    return { hasConflict, hasAnnotsConflicts };
  }
}
export const conflictsService = new ConflictsService();
