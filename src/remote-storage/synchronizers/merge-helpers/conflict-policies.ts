import {
  CollectionItem,
  CollectionItemType,
  CollectionItemUpdatableConflictFields,
  CollectionItemUpdatableFieldEnum
} from '@/collection/collection';
import {
  CommentUpdatableConflictFields,
  CommentUpdatableFieldEnum,
  SyncableComment
} from '@/domain/comments/model';
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
          (!remoteItem || localItem[field] !== remoteItem[field])))
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

class CommentsConflictPolicy extends ConflictPolicy<SyncableComment> {
  public shouldCreateConflict(
    localChange: LocalChangeResult,
    localItem: SyncableComment | undefined,
    remoteItem: SyncableComment
  ): boolean {
    const field = localChange.field as CommentUpdatableFieldEnum;
    return (
      localItem !== undefined &&
      !localItem.conflict &&
      (!localChange.field ||
        (CommentUpdatableConflictFields.includes(field) &&
          (!remoteItem || localItem[field] !== remoteItem[field])))
    );
  }
  public newConflict(
    localChange: LocalChangeResult,
    localItem: SyncableComment
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
export const commentConflictPolicy = new CommentsConflictPolicy();
