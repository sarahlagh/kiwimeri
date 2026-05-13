import {
  CollectionItem,
  CollectionItemType,
  CollectionItemUpdatableConflictFields,
  CollectionItemUpdatableFieldEnum,
  CollectionItemUpdateChangeFields,
  isDocument,
  isPage,
  isPageOrDocument,
  parseFieldMeta
} from '@/collection/collection';
import {
  minimizeItemsForStorage,
  MinKeys,
  unminimizeItemsFromStorage
} from '@/collection/compress-collection';
import { nOr0 } from '@/common/utils';
import { appConfig, getGlobalTrans } from '@/config';
import { CONFLICTS_NOTEBOOK_ID, ROOT_COLLECTION } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/local-changes.service';
import notebooksService from '@/db/notebooks.service';
import storageService from '@/db/storage.service';
import { SpaceType, SpaceValues } from '@/db/types/space-types';
import {
  AnyData,
  LocalChange,
  LocalChangeType,
  RemoteResult,
  RemoteState,
  RemoteWithState,
  SerializableData
} from '@/db/types/store-types';
import userSettingsService from '@/db/user-settings.service';
import { resumeService } from '@/domain/resume-state/resume-state.service';
import { AllGlobalStatsBag, statsService } from '@/domain/stats/stats-service';
import { getUniqueId, Row, Table, Table as UntypedTable } from 'tinybase';
import { Content } from 'tinybase/store/with-schemas';
import { CloudStorageDriver } from '../storage-drivers/abstract.driver';
import { SingleFileStorage } from '../storage-filesystems/singlefile.filesystem';
import { AfterSyncHistChange } from '../sync-types';
import { CloudStorageSynchronizer } from './abstract-synchronizer';

export type MinimizedCollectionItem = {
  [key in MinKeys[number]]: SerializableData | undefined;
};

export type RemoteCollectionFileContent = {
  i: MinimizedCollectionItem[]; // the items
  o: SpaceValues; // the space options
  u: number; // last content change
};

type RemoteContentRepresentation = {
  items: CollectionItem[];
  values: SpaceValues;
  lastRemoteChange: number;
};

export class CollectionSynchronizer extends CloudStorageSynchronizer {
  protected cloudFS: SingleFileStorage;
  protected connectedRemote: RemoteWithState;
  protected ongoing = false;

  constructor(
    protected remote: RemoteResult,
    protected driver: CloudStorageDriver
  ) {
    super();
    this.connectedRemote = remote;
    this.cloudFS = new SingleFileStorage('collection', driver, {
      filename: 'collection.json'
    });
  }

  public async configure(config: AnyData, proxy?: string, useHttp?: boolean) {
    return this.driver.configure(config, proxy, useHttp);
  }

  public async connect(): Promise<{
    config?: AnyData | null;
    connected: boolean;
  }> {
    const resp = await this.cloudFS.connect();
    if (resp.remoteState.connected) {
      this.updateRemoteStateInfo(this.remote.state, resp.remoteState);
    }
    return {
      config: resp.config,
      connected: resp.remoteState.connected || false
    };
  }

  public async push(force = false) {
    let didPush = false;
    if (this.ongoing) return { success: false, didPush };
    console.log(`[collection][push] starting`);
    if (localChangesService.getLocalChanges().length === 0 && !force) {
      console.log(`[collection][push] nothing to push`);
      return { success: true, didPush };
    }
    if (collectionService.getConflicts().length > 0) {
      console.log(
        `[collection][push] found local conflicts; pushing is not allowed`
      );
      return { success: true, didPush };
    }
    this.ongoing = true;
    const store = storageService.getSpace(this.remote.space);
    const localContent = store.getContent();
    const localChanges = localChangesService.getLocalChanges();
    try {
      // fetch remote if needed or use local content as comparison
      const remoteContent = await this.resolveRemoteContent(
        localContent,
        force
      );
      // compute data to send - merge local and remote
      const { hasNewChanges, data } = this.computeDataToPush(
        localContent,
        localChanges,
        remoteContent,
        force
      );

      // push to filesystem
      if ((hasNewChanges && data) || force) {
        const resp = await this.cloudFS.acceptsChanges(data);
        didPush = true;
        if (!resp.success || !resp.updatedRemoteState) {
          return { success: false, didPush };
        }
        // update remote info
        const updatedRemoteState = resp.updatedRemoteState;
        this.updateRemoteState(
          this.remote.state,
          updatedRemoteState,
          true,
          true
        );
      }

      return { success: true, didPush };
    } catch (e) {
      console.error('[collection][push] error', this.remote.name, e);
      return { success: false, didPush };
    } finally {
      this.ongoing = false;
      console.log(`[collection][push] done`);
    }
  }

  public async pull(force = false) {
    let didPull = false;
    if (this.ongoing) return { success: false, didPull };
    this.ongoing = true;
    console.log(`[collection][pull] starting`);
    const store = storageService.getSpace(this.remote.space);
    const localContent = store.getContent();
    const localChanges = localChangesService.getLocalChanges();
    const lastPulled = this.getLastPulled(this.remote.state);

    try {
      const resp = await this.cloudFS.fetchChanges(lastPulled, force);
      didPull = resp.didPull;
      if (
        resp.success &&
        resp.didPull &&
        resp.data &&
        resp.updatedRemoteState
      ) {
        this.applyMergeLocal(
          localContent,
          localChanges,
          resp.data as RemoteCollectionFileContent,
          force
        );
        const updatedRemoteState = resp.updatedRemoteState;
        this.updateRemoteState(
          this.remote.state,
          updatedRemoteState,
          force || localChanges.length == 0,
          force || false
        );
      }
      return { success: resp.success, didPull };
    } catch (e) {
      console.error('[collection][pull] error', this.remote.name, e);
      // restore
      this.setContent(localContent);
    } finally {
      this.ongoing = false;
      console.log(`[collection][pull] done`);
    }
    return { success: false, didPull };
  }

  private setContent(content: Content<SpaceType, false>) {
    storageService.getSpace().setTable('collection', content[0].collection!);
    storageService.getSpace().setValues(content[1]);
  }

  public async destroy() {
    return this.driver.close();
  }

  private async resolveRemoteContent(
    localContent: Content<SpaceType>,
    force: boolean
  ): Promise<RemoteContentRepresentation> {
    if (!force) {
      const lastPulled = this.getLastPulled(this.remote.state);
      const { success, didPull, data } =
        await this.cloudFS.fetchChanges(lastPulled);
      const hasNewChanges = success && didPull;
      if (hasNewChanges) {
        // TODO can't avoid calling driver.fetchFilesInfo twice for now
        // const { success, data } =
        //   await this.singlefileFS.fetchChanges(lastPulled);
        // if (!success) throw new Error('unable to fetch new content');
        const remoteContent = this.toRepresentation(
          data as RemoteCollectionFileContent
        );
        const values =
          remoteContent.values.lastUpdated >
          nOr0('lastUpdated', localContent[1])
            ? remoteContent.values
            : localContent[1];
        return {
          ...remoteContent,
          values
        };
      }
    }
    // else, just return local content
    return this.toRepresentationFromLocal(localContent);
  }

  private computeDataToPush(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    remoteContent: RemoteContentRepresentation,
    force: boolean
  ): { data: AnyData; hasNewChanges: boolean } {
    const globalStats = statsService.getAllGlobalStats();
    const newRemoteItems = remoteContent.items;
    const newRemoteValues = remoteContent.values;
    const collection = this.toMap<CollectionItem>(localContent[0].collection!);
    let lastLocalChange = remoteContent.lastRemoteChange;
    if (localChanges.length > 0) {
      lastLocalChange = Math.max(...localChanges.map(lc => lc.updated));
      // reapply local changes
      for (const localChange of localChanges) {
        if (localChange.change === LocalChangeType.value) {
          continue;
        }
        const itemIdx = newRemoteItems.findIndex(
          ri => ri.id === localChange.item
        );
        console.debug(
          '[collection][push] handling local change',
          localChange,
          itemIdx
        );
        if (
          itemIdx === -1 &&
          localChange.change !== LocalChangeType.delete &&
          collection.has(localChange.item)
        ) {
          newRemoteItems.push(collection.get(localChange.item)!);
          continue;
        }
        if (itemIdx > -1) {
          if (localChange.change === LocalChangeType.update) {
            // local always wins
            newRemoteItems[itemIdx] = collection.get(localChange.item)!;
          } else if (localChange.change === LocalChangeType.delete) {
            newRemoteItems.splice(itemIdx, 1);
          }
        }
      }
    }

    let data: RemoteCollectionFileContent;
    if (localChanges.length > 0 || force) {
      data = this.toFileContent(
        newRemoteItems,
        newRemoteValues,
        globalStats,
        lastLocalChange
      );
    } else {
      const localContentRep = this.toRepresentationFromLocal(localContent);
      data = this.toFileContent(
        localContentRep.items,
        localContentRep.values,
        globalStats,
        lastLocalChange
      );
    }
    return { hasNewChanges: localChanges.length > 0, data };
  }

  private applyMergeLocal(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    remoteContent: RemoteCollectionFileContent,
    force: boolean
  ) {
    const resp = this.computeDataToMergeLocally(
      structuredClone(localContent),
      localChanges,
      remoteContent,
      force
    );
    // TODO check success?
    historyService.saveNow();
    this.setContent(resp.content);
    this.handleResumeState(resp.changes);
    this.handleHistory(resp.changes);
    this.handleDiscardedChanges(resp.discardedChanges);
  }

  private computeDataToMergeLocally(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    obj: RemoteCollectionFileContent,
    force: boolean
  ): {
    content: Content<SpaceType>;
    discardedChanges: LocalChange[];
    changes: AfterSyncHistChange[];
  } {
    const discardedChanges: LocalChange[] = [];
    const remoteContent = this.toRepresentation(obj);
    const remoteItems = remoteContent.items;
    const changes: Map<string, AfterSyncHistChange> = new Map();

    const localCollection = this.toMap<CollectionItem>(
      localContent[0].collection
    );
    const newValues =
      force ||
      remoteContent.values.lastUpdated > nOr0('lastUpdated', localContent[1])
        ? remoteContent.values
        : localContent[1];

    const newLocalContent: Content<SpaceType> = [
      { ...localContent[0], collection: {} }, // don't override other tables
      newValues
    ];
    // fill-in new collection with remote content
    remoteItems.forEach(item => {
      newLocalContent[0].collection![item.id!] = item;
    });

    if (!force && localChanges.length > 0) {
      // reapply localChanges
      for (const localChange of localChanges) {
        if (localChange.change === LocalChangeType.value) {
          continue;
        }
        const remoteUpdated = this.getRemoteUpdatedTS(
          localChange,
          newLocalContent[0].collection!,
          remoteContent.lastRemoteChange
        );
        const localItem = localCollection.get(localChange.item);

        // if added locally, add to newLocalContent
        if (localChange.change === LocalChangeType.add) {
          newLocalContent[0].collection![localChange.item] = localItem!;

          // if local change on item is more recent than remote, local wins
        } else if (localChange.updated > remoteUpdated) {
          // if is update
          if (localChange.change === LocalChangeType.update) {
            const field = localChange.field!;

            // if doesn't exist on remote (has been deleted?) recreate it
            if (!newLocalContent[0].collection![localChange.item]) {
              newLocalContent[0].collection![localChange.item] = localItem!;
            } else {
              // if exists on remote, update the field, its meta, and preview if field was content
              newLocalContent[0].collection![localChange.item][field] =
                localItem![field];
              newLocalContent[0].collection![localChange.item][
                `${field}_meta`
              ] = localItem![`${field}_meta`];
            }
          } else {
            // is delete
            delete newLocalContent[0].collection![localChange.item];
          }
        } else {
          // if remote change on item is more recent than local
          // create conflict, only if item is not already a conflict and is a document or page
          // do not create conflict for folders and notebooks
          if (
            this.shouldCreateConflict(
              localChange,
              localItem,
              newLocalContent[0].collection![localChange.item] as CollectionItem
            )
          ) {
            const ts = Date.now();
            newLocalContent[0].collection![getUniqueId()] = {
              ...{ ...localItem, id: undefined },
              conflict: localChange.item,
              created: ts,
              updated: ts
            };
          } else {
            discardedChanges.push(localChange);
          }
        }
      }

      this.checkOrphans(newLocalContent[0].collection!);
    }

    // detect historizable remote changes
    const ids = new Set<string>([
      ...Object.keys(newLocalContent[0].collection!),
      ...Object.keys(localContent[0].collection!)
    ]);
    ids.forEach(id => {
      // TODO how do we handle local changes when force full?
      const localChange = localChanges.find(lc => lc.item === id);
      const newItem = newLocalContent[0].collection![id];
      const oldItem = localCollection.get(id);
      if (newItem && !newItem.conflict && !oldItem) {
        const type = newItem.type as CollectionItemType;
        // added by remote
        changes.set(id, {
          id,
          type,
          parent: newItem.parent as string,
          change: LocalChangeType.add
        });
      } else if (
        !newItem &&
        oldItem &&
        (force || localChange?.change !== LocalChangeType.add)
      ) {
        // deleted by remote
        changes.set(id, {
          id,
          type: oldItem.type as CollectionItemType,
          parent: oldItem.parent as string,
          change: LocalChangeType.delete
        });
      } else if (newItem && oldItem) {
        const type = newItem.type as CollectionItemType;
        const historizableFields = [
          ...CollectionItemUpdateChangeFields,
          'order' as CollectionItemUpdatableFieldEnum
        ]
          .filter(field =>
            collectionService.isHistorizableContentChange(type, field)
          )
          .filter(field => localChange?.field !== field);

        // no local change, remote change on hist field                 => new version
        // no local change, remote change on non hist field             => no new version
        // local change, no remote change                               => no new version
        // local change, remote change on hist field, local wins        => no new version
        // local change, remote change on hist field, remote wins       => new version
        // local change, remote change on non hist field, local wins    => no new version
        // local change, remote change on non hist field, remote wins   => no new version
        for (const field of historizableFields) {
          // only create change for the first field
          // if local wins, mustn't have new version - won't happen if no local change
          if (oldItem[field] !== newItem[field]) {
            changes.set(id, {
              id,
              type,
              parent: newItem.parent as string,
              change: LocalChangeType.update,
              field
            });
            break;
          }
        }
      }
    });

    console.debug(
      '[collection][pull] changes after sync',
      changes,
      'discarded',
      discardedChanges
    );
    return {
      content: newLocalContent,
      discardedChanges,
      changes: [...changes.values()]
    };
  }

  private toMap<T>(obj?: UntypedTable) {
    const map: Map<string, T> = new Map();
    if (obj) {
      Object.keys(obj).forEach(id => {
        map.set(id, { ...(obj[id] as unknown as T), id });
      });
    }
    return map;
  }

  private toRepresentationFromLocal(
    localContent: Content<SpaceType>
  ): RemoteContentRepresentation {
    const collection = this.toMap<CollectionItem>(localContent[0].collection!);
    const items = [...collection.values()].filter(v => !v.conflict);
    return {
      items,
      values: localContent[1],
      lastRemoteChange: localContent[1].lastUpdated
    };
  }

  private toRepresentation(
    data: RemoteCollectionFileContent
  ): RemoteContentRepresentation {
    const obj = data;

    if (!obj.o) {
      // shouldn't happen except in dev - TODO better version detection before pulling
      const spaceDefaults = userSettingsService.getSpaceDefaultDisplayOpts();
      obj.o = {
        defaultSortBy: spaceDefaults.sort.by,
        defaultSortDesc: spaceDefaults.sort.descending,
        statsEnabled: spaceDefaults.statsEnabled,
        historyIdleTime: userSettingsService.getHistoryIdleTime(),
        historyMaxInterval: userSettingsService.getHistoryMaxInterval(),
        maxHistoryPerDoc: userSettingsService.getHistoryMaxVersions(),
        schemaVersion: appConfig.KIWIMERI_VERSION,
        lastUpdated: 0
      };
    }

    return {
      items: unminimizeItemsFromStorage(obj.i),
      values: obj.o,
      lastRemoteChange: obj.u
    };
  }

  private toFileContent(
    items: CollectionItem[],
    values: SpaceValues,
    global: AllGlobalStatsBag,
    updated: number
  ): RemoteCollectionFileContent {
    return {
      i: minimizeItemsForStorage(
        items.map(item => ({ ...item, ...global[item.id!] }))
      ) as MinimizedCollectionItem[],
      o: values,
      u: updated
    };
  }

  private updateRemoteState(
    state: string,
    updatedRemoteState: RemoteState,
    updateLocalChanges: boolean,
    clearLocalChanges: boolean
  ) {
    storageService.getStore().transaction(() => {
      if (updateLocalChanges) {
        localChangesService.setLastLocalChange(
          updatedRemoteState.lastRemoteChange || 0
        );
      }
      if (clearLocalChanges) {
        localChangesService.clear();
      }
      this.updateRemoteStateInfo(state, updatedRemoteState);
    });
  }

  private handleResumeState(changes: AfterSyncHistChange[]) {
    // reset resume state if content has changed
    changes
      .filter(ch => isPageOrDocument({ type: ch.type }))
      .filter(ch => ch.field === 'content')
      .forEach(ch => resumeService.setLastSelection(ch.id, null));
  }

  private handleHistory(changes: AfterSyncHistChange[]) {
    // history must be updated
    // only take single pages changes if a parent document change isn't present
    const docsMap = new Map<string, AfterSyncHistChange>();
    changes
      .filter(ch => isDocument({ type: ch.type }))
      .forEach(ch => docsMap.set(ch.id, ch));
    changes
      .filter(
        ch =>
          isPage({ type: ch.type }) &&
          !docsMap.has(ch.parent) &&
          ch.change !== LocalChangeType.delete
      )
      .forEach(ch => {
        docsMap.set(ch.parent, {
          id: ch.parent,
          type: CollectionItemType.document,
          change: ch.change,
          parent: '' // on doc, parent not used
        });
      });

    // special case for pages deleted
    changes
      .filter(
        ch => isPage({ type: ch.type }) && ch.change === LocalChangeType.delete
      )
      .forEach(ch => {
        historyService.markLatestVersionDeleted(
          ch.type,
          ch.id,
          ch.parent,
          true
        );
        if (!docsMap.has(ch.parent)) {
          docsMap.set(ch.parent, {
            id: ch.parent,
            type: CollectionItemType.document,
            change: LocalChangeType.update,
            parent: '' // on doc, parent not used
          });
        }
      });
    [...docsMap.values()].forEach(ch => {
      historyService.updateAfterSync(ch);
    });
    historyService.gc();
  }

  private handleDiscardedChanges(discardedChanges: LocalChange[]) {
    discardedChanges.forEach(localChange => {
      localChangesService.delLocalChange(localChange.id!);
    });
  }

  private shouldCreateConflict(
    localChange: LocalChange,
    localItem: CollectionItem | undefined,
    remoteItem: CollectionItem
  ) {
    return (
      localItem &&
      !localItem.conflict &&
      localItem.type !== CollectionItemType.folder &&
      localItem.type !== CollectionItemType.notebook &&
      (!localChange.field ||
        (CollectionItemUpdatableConflictFields.includes(localChange.field) &&
          (!remoteItem ||
            localItem[localChange.field] !== remoteItem[localChange.field])))
    );
  }

  private getRemoteUpdatedTS(
    localChange: LocalChange,
    remoteCollection: Table,
    remoteContentUpdated?: number
  ) {
    // remoteUpdated is the 'updated' ts on the remote item, OR the collection updated ts if the item is deleted
    let remoteUpdated = remoteCollection[localChange.item]
      ? (remoteCollection[localChange.item].updated as number)
      : remoteContentUpdated || 0;
    console.debug(
      '[collection][pull] handling local change',
      localChange,
      remoteUpdated
    );

    // but if item exists on remote, and it's an update, only take the meta ts
    if (
      localChange.change === LocalChangeType.update &&
      remoteCollection[localChange.item]
    ) {
      const meta = remoteCollection[localChange.item][
        `${localChange.field as CollectionItemUpdatableFieldEnum}_meta`
      ] as string;
      if (meta) {
        remoteUpdated = parseFieldMeta(meta).u;
      } else {
        remoteUpdated = 0;
      }
    }

    return remoteUpdated;
  }

  private checkOrphans(newCollectionAfterPull: Table) {
    // check for orphans
    // not sure I can do this in one loop here - still, optimize?
    // here all the timestamps have already been checked, so any orphan here should be recreated safely
    for (const id of Object.keys(newCollectionAfterPull)) {
      const item = newCollectionAfterPull[id] as unknown as CollectionItem;
      if (
        item.parent === ROOT_COLLECTION ||
        newCollectionAfterPull[item.parent]
      ) {
        continue;
      }

      if (newCollectionAfterPull[id].conflict) {
        // don't keep orphaned conflicts
        delete newCollectionAfterPull[id];
        continue;
      }
      // if parent doesn't exist, put the item in conflicts notebook
      // TODO check if parent is allowed too (page under doc, etc.)
      console.debug('[collection][pull] orphan detected', id, item.title);
      this.createConflictsNotebookIfNeeded(newCollectionAfterPull);
      newCollectionAfterPull[id].parent = CONFLICTS_NOTEBOOK_ID;
      newCollectionAfterPull[id].conflict = id;
    }
  }

  private createConflictsNotebookIfNeeded(newCollectionAfterPull: Table) {
    if (!newCollectionAfterPull[CONFLICTS_NOTEBOOK_ID]) {
      const { item: conflictsNotebook } = notebooksService.getNewNotebookObj(
        ROOT_COLLECTION,
        getGlobalTrans().conflictsNotebookName
      );
      localChangesService.addLocalChange(
        CONFLICTS_NOTEBOOK_ID,
        LocalChangeType.add
      );
      newCollectionAfterPull[CONFLICTS_NOTEBOOK_ID] =
        conflictsNotebook as unknown as Row;
    }
  }
}
