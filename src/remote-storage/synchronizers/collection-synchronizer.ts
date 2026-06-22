import {
  CollectionItemType,
  CollectionItemUpdatableFields,
  CollectionItemWithId,
  isDocument
} from '@/collection/collection';
import {
  MinKeys as ItemsMinKeys,
  minimizeItemsForStorage,
  unminimizeItemsFromStorage
} from '@/collection/compress-collection';
import { cellEquals } from '@/common/utils';
import { space, store } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import {
  SpaceTableId,
  SpaceTablesType,
  SpaceType
} from '@/core/db/store-schema';
import { TypeWithId, WithId } from '@/core/db/types';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import {
  AnyData,
  RemoteResult,
  RemoteState,
  RemoteWithState,
  SerializableData
} from '@/db/types/store-types';
import { conflictsService } from '@/domain/conflicts/conflicts-service';
import {
  minimizeAnnotForStorage,
  MinimizedDocAnnotation,
  unminimizeAnnotFromStorage
} from '@/domain/document-annotations/compress-annotations';
import {
  DocAnnotationRow,
  SyncableAnnotation
} from '@/domain/document-annotations/model';
import {
  startLocalChangesListeners,
  stopLocalChangesListeners
} from '@/domain/local-changes/listeners';
import localChangesService from '@/domain/local-changes/local-changes.service';
import {
  LocalChangeResult,
  LocalChangeType
} from '@/domain/local-changes/model';
import { resumeService } from '@/domain/resume-state/resume-state.service';
import {
  MinimizedUserPref,
  minimizePrefsForStorage,
  unminimizePrefsFromStorage
} from '@/domain/user-preferences/compress-user-prefs';
import {
  SyncableUserPref,
  UserPreferenceRow
} from '@/domain/user-preferences/model';
import { Table as UntypedTable } from 'tinybase';
import { Content, Table } from 'tinybase/store/with-schemas';
import { CloudStorageDriver } from '../storage-drivers/abstract.driver';
import { SingleFileStorage } from '../storage-filesystems/singlefile.filesystem';
import { AfterSyncChange } from '../sync-types';
import { CloudStorageSynchronizer } from './abstract-synchronizer';
import {
  annotsConflictPolicy,
  collectionConflictPolicy,
  noConflictPolicy
} from './merge-helpers/conflict-policies';
import {
  applyLocalChangesToPull,
  applyLocalChangesToPush,
  chainMerge
} from './merge-helpers/merge-helpers';
import {
  annotsOrphanPolicy,
  collectionOrphanPolicy,
  noOrphanPolicy
} from './merge-helpers/orphan-policies';

export type MinimizedCollectionItem = {
  [key in ItemsMinKeys[number]]: SerializableData | undefined;
};

export type RemoteCollectionFileContent = {
  i: MinimizedCollectionItem[]; // the items
  a?: MinimizedDocAnnotation[]; // the document annotations
  o?: MinimizedUserPref[]; // the user preferences / options
  u: number; // last content change
  _v?: number; // the schema version (!= app version)
};

type RemoteContentRepresentation = {
  items: CollectionItemWithId[];
  docAnnotations: SyncableAnnotation[];
  userPrefs: SyncableUserPref[];
  lastRemoteChange: number;
  schemaVersion: number;
};

export const REMOTE_COLLECTION_SCHEMA_VERSION = 1; // increment each breaking change

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
    const localChanges = localChangesService.getLocalChanges();
    if (localChanges.length === 0 && !force) {
      console.log(`[collection][push] nothing to push`);
      return { success: true, didPush };
    }
    if (conflictsService.getHasLocalConflicts()) {
      console.log(
        `[collection][push] found local conflicts; pushing is not allowed`
      );
      return { success: true, didPush };
    }
    this.ongoing = true;
    const localContent = space.getContent();
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
        this.updateRemoteState(this.remote.state, updatedRemoteState, true);
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
    const localContent = space.getContent();
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
          force || false
        );
      }
      return { success: resp.success, didPull };
    } catch (e) {
      console.error('[collection][pull] error', this.remote.name, e);
      // restore
      this.setContent(localContent); // TODO remove
    } finally {
      this.ongoing = false;
      console.log(`[collection][pull] done`);
    }
    return { success: false, didPull };
  }

  private setTable(
    tableName: SpaceTableId,
    table?: Table<SpaceTablesType, SpaceTableId, true>
  ) {
    if (table && Object.keys(table).length === 0) {
      space.delTable(tableName);
    }
    if (table) {
      space.setTable(tableName, table);
    }
  }

  private setContent(content: Content<SpaceType, false>) {
    stopLocalChangesListeners();
    space.transaction(() => {
      this.setTable(SpaceTables.Collection, content[0].collection);
      this.setTable(SpaceTables.Annotations, content[0].document_annotation);
      this.setTable(SpaceTables.UserPreference, content[0].user_preference);
    });
    startLocalChangesListeners();
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
      // TODO can't avoid calling driver.fetchFilesInfo twice for now
      const { success, didPull, data } =
        await this.cloudFS.fetchChanges(lastPulled);
      const hasNewChanges = success && didPull;
      if (hasNewChanges) {
        const remoteContent = this.toRepresentation(
          data as RemoteCollectionFileContent
        );
        if (remoteContent.schemaVersion !== REMOTE_COLLECTION_SCHEMA_VERSION) {
          throw new Error(
            `Version mismatch on remote collection filesystem: expected ${REMOTE_COLLECTION_SCHEMA_VERSION}, got ${remoteContent.schemaVersion}`
          );
        }
        return remoteContent;
      }
    }
    // else, just return local content
    return this.toRepresentationFromLocal(localContent);
  }

  private computeDataToPush(
    localContent: Content<SpaceType>,
    localChanges: LocalChangeResult[],
    remoteContent: RemoteContentRepresentation,
    force: boolean
  ): { data: AnyData; hasNewChanges: boolean } {
    let lastLocalChange = remoteContent.lastRemoteChange;
    if (localChanges.length > 0) {
      lastLocalChange = Math.max(...localChanges.map(lc => lc.createdAt));
    }

    // merge collection
    applyLocalChangesToPush(
      localContent,
      SpaceTables.Collection,
      localChanges,
      remoteContent.items as TypeWithId[]
    );

    // merge annotations
    applyLocalChangesToPush(
      localContent,
      SpaceTables.Annotations,
      localChanges,
      remoteContent.docAnnotations as TypeWithId[]
    );

    // merge user prefs
    applyLocalChangesToPush(
      localContent,
      SpaceTables.UserPreference,
      localChanges,
      remoteContent.userPrefs as TypeWithId[]
    );

    let data: RemoteCollectionFileContent;
    if (localChanges.length > 0 || force) {
      data = this.toFileContent(
        remoteContent,
        REMOTE_COLLECTION_SCHEMA_VERSION,
        lastLocalChange
      );
    } else {
      const localContentRep = this.toRepresentationFromLocal(localContent);
      data = this.toFileContent(
        localContentRep,
        localContentRep.schemaVersion,
        lastLocalChange
      );
    }
    return { hasNewChanges: localChanges.length > 0, data };
  }

  private applyMergeLocal(
    localContent: Content<SpaceType>,
    localChanges: LocalChangeResult[],
    remoteContent: RemoteCollectionFileContent,
    force: boolean
  ) {
    if (remoteContent._v !== REMOTE_COLLECTION_SCHEMA_VERSION) {
      throw new Error(
        `Version mismatch on remote collection filesystem: expected ${REMOTE_COLLECTION_SCHEMA_VERSION}, got ${remoteContent._v}`
      );
    }

    const resp = this.computeDataToMergeLocally(
      structuredClone(localContent),
      localChanges,
      remoteContent,
      force
    );
    historyService.saveNow();
    this.setContent(resp.content);
    this.handleResumeState(resp.changes);
    this.handleHistory(resp.changes);
    this.handleDiscardedChanges(resp.discardedChanges);
  }

  private computeDataToMergeLocally(
    localContent: Content<SpaceType>,
    localChanges: LocalChangeResult[],
    obj: RemoteCollectionFileContent,
    force: boolean
  ): {
    content: Content<SpaceType>;
    discardedChanges: LocalChangeResult[];
    changes: AfterSyncChange[];
  } {
    const remoteContent = this.toRepresentation(obj);

    const { newLocalContent, discardedChanges } = chainMerge(localContent, [
      res =>
        applyLocalChangesToPull(
          SpaceTables.Collection,
          res.newLocalContent,
          remoteContent.items,
          remoteContent.lastRemoteChange,
          localChanges,
          collectionConflictPolicy,
          collectionOrphanPolicy,
          force
        ),
      res =>
        applyLocalChangesToPull(
          SpaceTables.Annotations,
          res.newLocalContent,
          remoteContent.docAnnotations,
          remoteContent.lastRemoteChange,
          localChanges,
          annotsConflictPolicy,
          annotsOrphanPolicy,
          force,
          true
        ),
      res =>
        applyLocalChangesToPull(
          SpaceTables.UserPreference,
          res.newLocalContent,
          remoteContent.userPrefs as never[],
          remoteContent.lastRemoteChange,
          localChanges,
          noConflictPolicy,
          noOrphanPolicy,
          force
        )
    ]);

    // check cell changes
    const changes = this.afterSyncHistChanges(
      newLocalContent,
      localContent,
      localChanges,
      force
    );
    console.debug(
      '[collection][pull] changes after sync',
      changes,
      'discarded',
      discardedChanges
    );
    return {
      content: newLocalContent,
      discardedChanges: discardedChanges,
      changes
    };
  }

  private afterSyncHistChanges(
    newLocalContent: Content<SpaceType>,
    localContent: Content<SpaceType>,
    localChanges: LocalChangeResult[],
    force?: boolean
  ) {
    const tableId = 'collection';
    const changes: Map<string, AfterSyncChange> = new Map();
    const ids = new Set<string>([
      ...Object.keys(newLocalContent[0].collection!),
      ...Object.keys(localContent[0].collection!)
    ]);
    ids.forEach(id => {
      // TODO how do we handle local changes when force full?
      const localChange = localChanges.find(
        lc => lc.itemId === id && lc.on === tableId
      );
      const newItem = newLocalContent[0].collection![id];
      const oldItem = localContent[0].collection![id];
      if (newItem && !newItem.conflict && !oldItem) {
        const type = newItem.type as CollectionItemType;
        // added by remote
        changes.set(id, {
          id,
          type,
          on: tableId,
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
          on: tableId,
          type: oldItem.type as CollectionItemType,
          parent: oldItem.parent as string,
          change: LocalChangeType.delete
        });
      } else if (newItem && oldItem) {
        const type = newItem.type as CollectionItemType;
        const historizableFields = [...CollectionItemUpdatableFields].filter(
          field => localChange?.field !== field
        );

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
          if (!cellEquals(oldItem[field], newItem[field])) {
            changes.set(id, {
              id,
              type,
              on: tableId,
              parent: newItem.parent as string,
              change: LocalChangeType.update,
              field
            });
            break;
          }
        }
      }
    });
    return [...changes.values()];
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
    const collection = this.toMap<CollectionItemWithId>(
      localContent[0].collection!
    );
    const annotation = this.toMap<WithId<DocAnnotationRow>>(
      localContent[0].document_annotation
    );
    const userPreference = this.toMap<WithId<UserPreferenceRow>>(
      localContent[0].user_preference
    );
    const items = [...collection.values()].filter(v => !v.conflict);
    const docAnnotations = [...annotation.values()];
    const userPrefs = [...userPreference.values()];
    const lastRemoteChange = Math.max(
      ...items.map(i => i.updated),
      ...docAnnotations.map(i => i.updatedAt)
    );
    return {
      items,
      docAnnotations,
      userPrefs,
      lastRemoteChange: lastRemoteChange,
      schemaVersion: REMOTE_COLLECTION_SCHEMA_VERSION
    };
  }

  private toRepresentation(
    data: RemoteCollectionFileContent
  ): RemoteContentRepresentation {
    const obj = data;

    return {
      items: unminimizeItemsFromStorage(obj.i),
      docAnnotations: unminimizeAnnotFromStorage(obj.a || []),
      userPrefs: unminimizePrefsFromStorage(obj.o || []),
      lastRemoteChange: obj.u,
      schemaVersion: obj._v || 0
    };
  }

  private toFileContent(
    remoteContent: RemoteContentRepresentation,
    schemaVersion: number,
    updated: number
  ): RemoteCollectionFileContent {
    return {
      i: minimizeItemsForStorage(
        remoteContent.items.map(item => ({ ...item }))
      ) as MinimizedCollectionItem[],
      a: minimizeAnnotForStorage(remoteContent.docAnnotations),
      o: minimizePrefsForStorage(remoteContent.userPrefs),
      u: updated,
      _v: schemaVersion
    };
  }

  private updateRemoteState(
    state: string,
    updatedRemoteState: RemoteState,
    clearLocalChanges: boolean
  ) {
    store.transaction(() => {
      if (clearLocalChanges) {
        localChangesService.clear();
      }
      this.updateRemoteStateInfo(state, updatedRemoteState);
    });
  }

  private handleResumeState(changes: AfterSyncChange[]) {
    // reset resume state if content has changed
    changes
      .filter(ch => isDocument(ch.type) && ch.field === 'content')
      .forEach(ch => resumeService.setLastSelection(ch.id, null));
  }

  private handleHistory(changes: AfterSyncChange[]) {
    // history must be updated
    const docsMap = new Map<string, AfterSyncChange>();
    changes
      .filter(ch => isDocument({ type: ch.type }))
      .filter(
        ch =>
          !ch.field ||
          collectionService.isHistorizableContentChange(ch.type, ch.field)
      )
      .forEach(ch => docsMap.set(ch.id, ch));

    [...docsMap.values()].forEach(ch => {
      historyService.updateAfterSync(ch);
    });
    historyService.gc();
  }

  private handleDiscardedChanges(discardedChanges: LocalChangeResult[]) {
    discardedChanges.forEach(localChange => {
      localChangesService.delete(localChange.id);
    });
  }
}
