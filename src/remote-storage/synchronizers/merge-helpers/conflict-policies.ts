import {
  CollectionItemType,
  CollectionItemUpdatableConflictFields,
  CollectionItemUpdatableFieldEnum,
  CollectionItemWithId
} from '@/collection/collection';
import { LocalChangeResult } from '@/domain/local-changes/model';

export abstract class ConflictPolicy<R> {
  public abstract shouldCreateConflict(
    localChange: LocalChangeResult,
    localItem: R | undefined,
    remoteItem: R
  ): boolean;

  public abstract newConflict(
    localChange: LocalChangeResult,
    localItem: R | undefined
  ): Omit<R, 'id'>;
}

class CollectionConflictPolicy extends ConflictPolicy<CollectionItemWithId> {
  public shouldCreateConflict(
    localChange: LocalChangeResult,
    localItem: CollectionItemWithId | undefined,
    remoteItem: CollectionItemWithId
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
    localItem: CollectionItemWithId
  ): Omit<CollectionItemWithId, 'id'> {
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
