import {
  CollectionItem,
  CollectionItemType,
  CollectionItemUpdatableConflictFields,
  CollectionItemUpdatableFieldEnum
} from '@/collection/collection';
import { cellEquals } from '@/common/utils';
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
      !localItem.conflict &&
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
      conflict: localChange.itemId,
      created: ts,
      updated: ts
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
      !localItem.conflict &&
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
      conflict: localChange.itemId,
      createdAt: ts,
      updatedAt: ts
    };
  }
}
export const annotsConflictPolicy = new AnnotsConflictPolicy();
