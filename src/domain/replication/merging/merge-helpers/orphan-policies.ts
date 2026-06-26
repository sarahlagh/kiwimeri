import { CollectionItem } from '@/collection/collection';
import {
  CONFLICTS_NOTEBOOK_ID,
  getGlobalTrans,
  ROOT_COLLECTION
} from '@/constants';
import { SpaceTables } from '@/core/db/store-constants';
import { SpaceType } from '@/core/db/store-schema';
import notebooksService from '@/db/notebooks.service';
import { SyncableAnnotation } from '@/domain/document-annotations/model';
import localChangesService from '@/domain/local-changes/local-changes.service';
import { LocalChangeOn, LocalChangeType } from '@/domain/local-changes/model';
import { Row, Table } from 'tinybase/store';
import { Content, Id } from 'tinybase/with-schemas';

export abstract class OrphanPolicy<L> {
  constructor(protected on: LocalChangeOn) {}
  public abstract isOrphan(
    item: L,
    newTableAfterPull: Table,
    localContent: Content<SpaceType>
  ): boolean;
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
      localChangesService.addManualLocalChange(
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

class AnnotsOrphanPolicy extends OrphanPolicy<SyncableAnnotation> {
  constructor() {
    super(SpaceTables.Annotations);
  }
  public isOrphan(
    item: SyncableAnnotation,
    newTableAfterPull: Table,
    localContent: Content<SpaceType>
  ): boolean {
    const newCollectionAfterPull = localContent[0].collection!;
    return !newCollectionAfterPull[item.itemId];
  }

  public handleOrphan(id: Id, newTableAfterPull: Table): void {
    console.debug('[collection][pull] orphan detected', this.on, id);
    delete newTableAfterPull[id];
  }
}
export const annotsOrphanPolicy = new AnnotsOrphanPolicy();

class NoOrphanPolicy extends OrphanPolicy<never> {
  constructor() {
    super(SpaceTables.Collection); // table doesn't matter
  }
  public isOrphan(): boolean {
    return false;
  }

  public handleOrphan(): void {
    /* */
  }
}
export const noOrphanPolicy = new NoOrphanPolicy();
