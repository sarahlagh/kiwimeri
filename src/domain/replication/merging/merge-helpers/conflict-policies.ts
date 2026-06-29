import { cellEquals } from '@/common/utils';
import {
  CollectionItem,
  CollectionItemType,
  CollectionItemUpdatableConflictFields,
  CollectionItemUpdatableFieldEnum
} from '@/domain/collection/model';
import {
  DocAnnotationUpdatableConflictFields,
  DocAnnotationUpdatableFieldEnum,
  SyncableAnnotation
} from '@/domain/document-annotations/model';
import { LocalChangeResult } from '@/domain/local-changes/model';

export abstract class ConflictPolicy<L> {
  public abstract shouldCreateConflict(
    localChange: LocalChangeResult,
    localItem: L | undefined,
    remoteItem: L
  ): boolean;

  public abstract newConflict(
    localChange: LocalChangeResult,
    localItem: L | undefined
  ): L;
}

class CollectionConflictPolicy extends ConflictPolicy<CollectionItem> {
  public shouldCreateConflict(
    localChange: LocalChangeResult,
    localItem: CollectionItem | undefined,
    remoteItem: CollectionItem
  ): boolean {
    const field = localChange.field as CollectionItemUpdatableFieldEnum;
    return (
      localItem !== undefined &&
      !localItem.conflictId &&
      localItem.type !== CollectionItemType.folder &&
      localItem.type !== CollectionItemType.notebook &&
      (!localChange.field ||
        (CollectionItemUpdatableConflictFields.includes(field) &&
          (!remoteItem || !cellEquals(localItem[field], remoteItem[field]))))
    );
  }
  public newConflict(
    localChange: LocalChangeResult,
    localItem: CollectionItem
  ): Omit<CollectionItem, 'id'> {
    const ts = Date.now();
    return {
      ...{ ...localItem, id: undefined },
      conflictId: localChange.itemId,
      createdAt: ts,
      updatedAt: ts
    };
  }
}
export const collectionConflictPolicy = new CollectionConflictPolicy();

class AnnotsConflictPolicy extends ConflictPolicy<SyncableAnnotation> {
  public shouldCreateConflict(
    localChange: LocalChangeResult,
    localItem: SyncableAnnotation | undefined,
    remoteItem: SyncableAnnotation
  ): boolean {
    const field = localChange.field as DocAnnotationUpdatableFieldEnum;
    return (
      localItem !== undefined &&
      !localItem.conflictId &&
      (!localChange.field ||
        (DocAnnotationUpdatableConflictFields.includes(field) &&
          (!remoteItem || localItem[field] !== remoteItem[field])))
    );
  }
  public newConflict(
    localChange: LocalChangeResult,
    localItem: SyncableAnnotation
  ) {
    const ts = Date.now();
    return {
      ...{ ...localItem, id: 'to-be-dropped' },
      conflictId: localChange.itemId,
      createdAt: ts,
      updatedAt: ts
    };
  }
}
export const annotsConflictPolicy = new AnnotsConflictPolicy();

class NoConflictPolicy extends ConflictPolicy<never> {
  public shouldCreateConflict(): boolean {
    return false;
  }
  public newConflict() {
    return {} as never;
  }
}
export const noConflictPolicy = new NoConflictPolicy();
