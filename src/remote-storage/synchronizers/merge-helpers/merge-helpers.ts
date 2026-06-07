import { SpaceTableId, SpaceType } from '@/core/db/store-schema';
import { MetaField, TypeWithId, WithId } from '@/core/db/types';
import {
  LocalChangeResult,
  LocalChangeType
} from '@/domain/local-changes/model';
import { getUniqueId, Table } from 'tinybase';
import { Content, Id, Row } from 'tinybase/with-schemas';
import { ConflictPolicy } from './conflict-policies';
import { OrphanPolicy } from './orphan-policies';

type StringKey<R> = Extract<keyof R, string>;
type FieldWithMeta<R> = {
  [K in StringKey<R>]: `${K}_meta` extends keyof R ? K : never;
}[StringKey<R>];
type MetaKey<K extends string> = `${K}_meta`;

export function applyLocalChangesToPush<R extends TypeWithId>(
  localContent: Content<SpaceType>,
  tableId: SpaceTableId,
  allLocalChanges: LocalChangeResult[],
  newRemoteItems: R[]
): R[] {
  const dataTable = localContent[0][tableId]! as { [key: Id]: R };
  const localChanges = allLocalChanges.filter(lc => lc.on === tableId);
  if (localChanges.length > 0) {
    // reapply local changes
    for (const localChange of localChanges) {
      const itemIdx = newRemoteItems.findIndex(
        ri => ri.id === localChange.itemId
      );
      console.debug(
        '[collection][push] handling local change',
        localChange,
        itemIdx
      );
      if (
        itemIdx === -1 &&
        localChange.change !== LocalChangeType.delete &&
        localChange.itemId in dataTable
      ) {
        newRemoteItems.push({
          ...dataTable[localChange.itemId],
          id: localChange.itemId
        });
        continue;
      }
      if (itemIdx > -1) {
        if (localChange.change === LocalChangeType.update) {
          // local always wins
          newRemoteItems[itemIdx] = {
            ...dataTable[localChange.itemId],
            id: localChange.itemId
          };
        } else if (localChange.change === LocalChangeType.delete) {
          newRemoteItems.splice(itemIdx, 1);
        }
      }
    }
  }

  return newRemoteItems;
}

// TODO depends on "updated" VS "updatedAt" for annots
function getRemoteUpdatedTS(
  localChange: LocalChangeResult,
  remoteCollection: Table,
  remoteContentUpdated?: number
) {
  // remoteUpdated is the 'updated' ts on the remote item, OR the collection updated ts if the item is deleted
  let remoteUpdated = remoteCollection[localChange.itemId]
    ? (remoteCollection[localChange.itemId].updated as number)
    : remoteContentUpdated || 0;

  // but if item exists on remote, and it's an update, only take the meta ts
  if (
    localChange.change === LocalChangeType.update &&
    remoteCollection[localChange.itemId]
  ) {
    const meta = remoteCollection[localChange.itemId][
      `${localChange.field}_meta`
    ] as MetaField;
    if (meta) {
      remoteUpdated = meta._u;
    } else {
      remoteUpdated = 0;
    }
  }

  return remoteUpdated;
}

function checkOrphans<R>(
  newTableAfterPull: Table,
  orphanPolicy: OrphanPolicy<R>,
  localContent: Content<SpaceType>
) {
  // check for orphans
  // not sure I can do this in one loop here - still, optimize?
  // here all the timestamps have already been checked, so any orphan here should be recreated safely
  for (const id of Object.keys(newTableAfterPull)) {
    const item = newTableAfterPull[id] as unknown as R;
    if (!orphanPolicy.isOrphan(item, newTableAfterPull, localContent)) {
      continue;
    }
    orphanPolicy.handleOrphan(id, newTableAfterPull);
  }
}

export function applyLocalChangesToPull<
  RootTableId extends SpaceTableId,
  L extends Row<SpaceType[0], RootTableId>,
  R extends WithId<L>
>(
  tableId: SpaceTableId,
  localContent: Content<SpaceType>,
  remoteItems: R[],
  lastRemoteChange: number,
  allLocalChanges: LocalChangeResult[],
  conflictPolicy: ConflictPolicy<L>,
  orphanPolicy: OrphanPolicy<L>,
  force?: boolean,
  mergeLocalRemoteAsBase = false
) {
  const dataTable = (localContent[0][tableId] || {}) as {
    [key: string]: L;
  };
  const localChanges = allLocalChanges.filter(lc => lc.on === tableId);
  const discardedChanges: LocalChangeResult[] = [];
  const newLocalContent: Content<SpaceType> = [
    { ...localContent[0] }, // don't override other tables
    localContent[1]
  ];
  newLocalContent[0][tableId] = {};
  // fill-in new collection with remote content
  remoteItems.forEach(item => {
    if (dataTable[item.id] && mergeLocalRemoteAsBase) {
      newLocalContent[0][tableId]![item.id] = {
        ...dataTable[item.id],
        ...item,
        id: undefined
      };
    } else {
      newLocalContent[0][tableId]![item.id] = { ...item, id: undefined };
    }
  });
  const newDataTable = newLocalContent[0][tableId]! as {
    [key: string]: L;
  };

  if (!force && localChanges.length > 0) {
    // reapply localChanges
    for (const localChange of localChanges) {
      const remoteUpdated = getRemoteUpdatedTS(
        localChange,
        newDataTable,
        lastRemoteChange
      );
      const localItem = dataTable[localChange.itemId];

      // if added locally, add to newLocalContent
      if (localChange.change === LocalChangeType.add) {
        newDataTable[localChange.itemId] = localItem;

        // if local change on item is more recent than remote, local wins
      } else if (localChange.createdAt > remoteUpdated) {
        // if is update
        if (localChange.change === LocalChangeType.update) {
          const field = localChange.field as FieldWithMeta<L>;
          const metaField = `${field}_meta` as MetaKey<typeof field> & keyof L;

          // if doesn't exist on remote (has been deleted?) recreate it
          if (!newDataTable[localChange.itemId]) {
            newDataTable[localChange.itemId] = localItem;
          } else {
            // if exists on remote, update the field, its meta, and preview if field was content
            newDataTable[localChange.itemId][field] = localItem[field];
            newDataTable[localChange.itemId][metaField] = localItem[metaField];
          }
        } else {
          // is delete
          delete newDataTable[localChange.itemId];
        }
      } else {
        // if remote change on item is more recent than local
        // can either:
        //   - create conflict
        //   - let last write win
        if (
          conflictPolicy.shouldCreateConflict(
            localChange,
            localItem,
            newDataTable[localChange.itemId]
          )
        ) {
          const conflictId = getUniqueId();
          newDataTable[conflictId] = conflictPolicy.newConflict(
            localChange,
            localItem
          );
        } else {
          // last write wins
          discardedChanges.push(localChange);
        }
      }
    }

    checkOrphans(newDataTable, orphanPolicy, localContent);
  }

  return { newLocalContent, discardedChanges };
}
