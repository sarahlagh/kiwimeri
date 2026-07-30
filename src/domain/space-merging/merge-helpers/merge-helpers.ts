import { SpaceTableId } from '@/core/db/store-schema';
import { MetaField } from '@/core/db/types';
import {
  LocalChangeResult,
  LocalChangeType
} from '@/domain/synchronization/local-changes';
import { Table } from 'tinybase';
import { Id } from 'tinybase/with-schemas';
import {
  SpacePortableData,
  SpacePortableDataKey,
  SpacePortableDataTableType,
  TableOf
} from '../types';
import { ConflictPolicy } from './conflict-policies';
import { OrphanPolicy } from './orphan-policies';

type StringKey<R> = Extract<keyof R, string>;
type FieldWithMeta<R> = {
  [K in StringKey<R>]: `${K}_meta` extends keyof R ? K : never;
}[StringKey<R>];
type MetaKey<K extends string> = `${K}_meta`;

export function applyLocalChangesToPush<R>(
  localContent: SpacePortableData,
  tableId: SpaceTableId,
  itemsKey: keyof SpacePortableData,
  allLocalChanges: LocalChangeResult[],
  newRemoteItems: TableOf<R>
) {
  const dataTable = localContent[itemsKey]! as { [key: Id]: R };
  const localChanges = allLocalChanges.filter(lc => lc.on === tableId);
  if (localChanges.length > 0) {
    // reapply local changes
    for (const localChange of localChanges) {
      const itemExist = newRemoteItems[localChange.itemId] !== undefined;
      console.debug(
        '[collection][push] handling local change',
        localChange,
        itemExist
      );
      if (
        !itemExist &&
        localChange.change !== LocalChangeType.delete &&
        localChange.itemId in dataTable
      ) {
        newRemoteItems[localChange.itemId] = {
          ...dataTable[localChange.itemId]
        };
        continue;
      }
      if (itemExist) {
        if (localChange.change === LocalChangeType.update) {
          // local always wins
          newRemoteItems[localChange.itemId] = {
            ...dataTable[localChange.itemId],
            id: localChange.itemId
          };
        } else if (localChange.change === LocalChangeType.delete) {
          delete newRemoteItems[localChange.itemId];
        }
      }
    }
  }
}

function getRemoteUpdatedTS(
  localChange: LocalChangeResult,
  remoteCollection: Table,
  remoteContentUpdated?: number
) {
  // remoteUpdated is the 'updatedAt' ts on the remote item, OR the collection updatedAt ts if the item is deleted
  let remoteUpdated = remoteContentUpdated || 0;
  if (remoteCollection[localChange.itemId]?.updatedAt !== undefined) {
    remoteUpdated = remoteCollection[localChange.itemId].updatedAt as number;
  }

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
  localContent: SpacePortableData
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

type ApplyLCResult = {
  newLocalContent: SpacePortableData;
  discardedChanges: LocalChangeResult[];
};
export function applyLocalChangesToPull<
  K extends SpacePortableDataKey,
  R extends SpacePortableDataTableType<K>
>(
  tableId: SpaceTableId,
  itemsKey: K,
  localContent: SpacePortableData,
  remoteContent: SpacePortableData,
  allLocalChanges: LocalChangeResult[],
  conflictPolicy: ConflictPolicy<R>,
  orphanPolicy: OrphanPolicy<R>,
  force?: boolean
): ApplyLCResult {
  const dataTable = localContent[itemsKey] || {};
  const localChanges = allLocalChanges.filter(lc => lc.on === tableId);
  const discardedChanges: LocalChangeResult[] = [];
  const newLocalContent: SpacePortableData = structuredClone(localContent);
  // fill-in new collection with remote content
  newLocalContent[itemsKey] = structuredClone(remoteContent[itemsKey] || {});
  const newDataTable = newLocalContent[itemsKey] as TableOf<R>;

  if (!force && localChanges.length > 0) {
    // reapply localChanges
    for (const localChange of localChanges) {
      const remoteUpdated = getRemoteUpdatedTS(
        localChange,
        newDataTable,
        remoteContent.lastChange
      );
      const localItem = dataTable[localChange.itemId] as R;

      // if added locally, add to newLocalContent
      if (localChange.change === LocalChangeType.add) {
        newDataTable[localChange.itemId] = localItem;

        // if local change on item is more recent than remote, local wins
      } else if (localChange.createdAt > remoteUpdated) {
        // if is update
        if (localChange.change === LocalChangeType.update) {
          const field = localChange.field as FieldWithMeta<R>;
          const metaField = `${field}_meta` as MetaKey<typeof field> & keyof R;

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
          const conflict = conflictPolicy.newConflict(localChange, localItem);
          newDataTable[conflict.id] = conflict;
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

type Chainable = (result: ApplyLCResult) => ApplyLCResult;

export function chainMerge(
  initialContent: SpacePortableData,
  chain: Chainable[]
) {
  const result: ApplyLCResult = {
    newLocalContent: initialContent,
    discardedChanges: []
  };
  for (const callable of chain) {
    const newResult = callable(result);
    result.discardedChanges = [
      ...result.discardedChanges,
      ...newResult.discardedChanges
    ];
    result.newLocalContent = newResult.newLocalContent;
  }
  return result;
}
