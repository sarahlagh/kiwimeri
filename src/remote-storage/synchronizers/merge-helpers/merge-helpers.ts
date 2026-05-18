import { parseFieldMeta } from '@/collection/collection';
import { AsId, TableIdFromSchema, WithId } from '@/core/db/types';
import { SpaceType } from '@/db/types/space-types';
import {
  LocalChangeResult,
  LocalChangeType
} from '@/domain/local-changes/model';
import { getUniqueId, Table, Table as UntypedTable } from 'tinybase';
import { Content } from 'tinybase/with-schemas';
import { ConflictPolicy } from './conflict-policies';
import { OrphanPolicy } from './orphan-policies';

// TODO to remove
function toMap<T>(obj?: UntypedTable) {
  const map: Map<string, T> = new Map();
  if (obj) {
    Object.keys(obj).forEach(id => {
      map.set(id, { ...(obj[id] as unknown as T), id });
    });
  }
  return map;
}

export function applyLocalChangesToPush<R extends WithId>(
  localContent: Content<SpaceType>,
  tableId: TableIdFromSchema<SpaceType[0]>,
  allLocalChanges: LocalChangeResult[],
  newRemoteItems: R[]
): R[] {
  const dataTable = toMap<R>(localContent[0][tableId]!);
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
        dataTable.has(localChange.itemId)
      ) {
        newRemoteItems.push(dataTable.get(localChange.itemId)!);
        continue;
      }
      if (itemIdx > -1) {
        if (localChange.change === LocalChangeType.update) {
          // local always wins
          newRemoteItems[itemIdx] = dataTable.get(localChange.itemId)!;
        } else if (localChange.change === LocalChangeType.delete) {
          newRemoteItems.splice(itemIdx, 1);
        }
      }
    }
  }

  return newRemoteItems;
}

// TODO depends on "updated" VS "updatedAt" for comments
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
    ] as string;
    if (meta) {
      remoteUpdated = parseFieldMeta(meta).u;
    } else {
      remoteUpdated = 0;
    }
  }

  return remoteUpdated;
}

function checkOrphans<R>(
  newTableAfterPull: Table,
  orphanPolicy: OrphanPolicy<R>
) {
  // check for orphans
  // not sure I can do this in one loop here - still, optimize?
  // here all the timestamps have already been checked, so any orphan here should be recreated safely
  for (const id of Object.keys(newTableAfterPull)) {
    const item = newTableAfterPull[id] as unknown as R;
    if (!orphanPolicy.isOrphan(item, newTableAfterPull)) {
      continue;
    }
    orphanPolicy.handleOrphan(id, newTableAfterPull);
  }
}

export function applyLocalChangesToPull<R extends WithId>(
  tableId: TableIdFromSchema<SpaceType[0]>,
  localContent: Content<SpaceType>,
  remoteItems: R[],
  lastRemoteChange: number,
  allLocalChanges: LocalChangeResult[],
  conflictPolicy: ConflictPolicy<R>,
  orphanPolicy: OrphanPolicy<R>,
  force?: boolean
) {
  // TODO
  const localChanges = allLocalChanges.filter(lc => lc.on === tableId);
  const discardedChanges: LocalChangeResult[] = [];
  const localCollection = toMap<R>(localContent[0][tableId]);
  const newLocalContent: Content<SpaceType> = [
    { ...localContent[0] }, // don't override other tables
    localContent[1]
  ];
  newLocalContent[0][tableId] = {};
  // fill-in new collection with remote content
  remoteItems.forEach(item => {
    newLocalContent[0][tableId]![item.id!] = item;
  });

  if (!force && localChanges.length > 0) {
    // reapply localChanges
    for (const localChange of localChanges) {
      const remoteUpdated = getRemoteUpdatedTS(
        localChange,
        newLocalContent[0][tableId]!,
        lastRemoteChange
      );
      const localItem = localCollection.get(localChange.itemId);

      // if added locally, add to newLocalContent
      if (localChange.change === LocalChangeType.add) {
        newLocalContent[0][tableId]![localChange.itemId] = localItem!;

        // if local change on item is more recent than remote, local wins
      } else if (localChange.createdAt > remoteUpdated) {
        // if is update
        if (localChange.change === LocalChangeType.update) {
          const field = localChange.field as AsId<keyof R>;

          // if doesn't exist on remote (has been deleted?) recreate it
          if (!newLocalContent[0][tableId]![localChange.itemId]) {
            newLocalContent[0][tableId]![localChange.itemId] = localItem;
          } else {
            // if exists on remote, update the field, its meta, and preview if field was content
            newLocalContent[0][tableId]![localChange.itemId][field] =
              localItem[field];
            newLocalContent[0][tableId]![localChange.itemId][`${field}_meta`] =
              localItem[`${field}_meta`];
          }
        } else {
          // is delete
          delete newLocalContent[0][tableId]![localChange.itemId];
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
            newLocalContent[0][tableId]![localChange.itemId] as R
          )
        ) {
          newLocalContent[0][tableId]![getUniqueId()] =
            conflictPolicy.newConflict(localChange, localItem);
        } else {
          // last write wins
          discardedChanges.push(localChange);
        }
      }
    }

    checkOrphans(newLocalContent[0][tableId]!, orphanPolicy);
  }

  return { newLocalContent, discardedChanges };
}
