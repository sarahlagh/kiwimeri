import { CollectionItem } from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import { CONFLICTS_NOTEBOOK_ID, ROOT_COLLECTION } from '@/constants';
import notebooksService from '@/db/notebooks.service';
import localChangesService from '@/domain/local-changes/local-changes.service';
import { LocalChangeOn, LocalChangeType } from '@/domain/local-changes/model';
import { Row, Table } from 'tinybase/store';
import { Id } from 'tinybase/with-schemas';

export abstract class OrphanPolicy<L> {
  constructor(protected on: LocalChangeOn) {}
  public abstract isOrphan(item: L, newTableAfterPull: Table): boolean;
  public abstract handleOrphan(id: Id, newTableAfterPull: Table): void;
}

class CollectionOrphanPolicy extends OrphanPolicy<CollectionItem> {
  constructor() {
    super('collection');
  }
  public isOrphan(item: CollectionItem, newTableAfterPull: Table): boolean {
    return item.parent !== ROOT_COLLECTION && !newTableAfterPull[item.parent];
  }

  private createConflictsNotebookIfNeeded(newCollectionAfterPull: Table) {
    if (!newCollectionAfterPull[CONFLICTS_NOTEBOOK_ID]) {
      const { item: conflictsNotebook } = notebooksService.getNewNotebookObj(
        ROOT_COLLECTION,
        getGlobalTrans().conflictsNotebookName
      );
      localChangesService.addLocalChange(
        'collection',
        CONFLICTS_NOTEBOOK_ID,
        LocalChangeType.add
      );
      newCollectionAfterPull[CONFLICTS_NOTEBOOK_ID] =
        conflictsNotebook as unknown as Row;
    }
  }

  public handleOrphan(id: Id, newTableAfterPull: Table): void {
    if (newTableAfterPull[id].conflict) {
      // don't keep orphaned conflicts
      delete newTableAfterPull[id];
      return;
    }
    // if parent doesn't exist, put the item in conflicts notebook
    console.debug('[collection][pull] orphan detected', this.on, id);
    this.createConflictsNotebookIfNeeded(newTableAfterPull);
    newTableAfterPull[id].parent = CONFLICTS_NOTEBOOK_ID;
    newTableAfterPull[id].conflict = id;
  }
}
export const collectionOrphanPolicy = new CollectionOrphanPolicy();
