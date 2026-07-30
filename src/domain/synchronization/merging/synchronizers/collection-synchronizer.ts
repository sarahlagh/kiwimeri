import { space, store } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { SpaceType } from '@/core/db/store-schema';
import { AnyData, SerializableData, TypeWithId } from '@/core/db/types';
import { CollectionItem } from '@/domain/collection/collection';
import {
  minimizeAnnotForStorage,
  MinimizedDocAnnotation,
  unminimizeAnnotFromStorage
} from '@/domain/collection/compress-annotations';
import {
  MinKeys as ItemsMinKeys,
  minimizeItemsForStorage,
  unminimizeItemsFromStorage
} from '@/domain/collection/compress-collection';
import { DocAnnotation } from '@/domain/collection/document-annotations';
import { historyService } from '@/domain/history/history.service';
import { storageService } from '@/domain/profiles/storage.service';
import {
  startLocalChangesListeners,
  stopLocalChangesListeners
} from '@/domain/synchronization//local-changes-listeners';
import { conflictsService } from '@/domain/synchronization/conflicts-service';
import { CloudStorageDriver } from '@/domain/synchronization/drivers/abstract.driver';
import { LocalChangeResult } from '@/domain/synchronization/local-changes';
import localChangesService from '@/domain/synchronization/local-changes.service';
import { SingleFileStorage } from '@/domain/synchronization/merging/layouts/singlefile.filesystem';
import { ReplicaState } from '@/domain/synchronization/replica-state';
import {
  MinimizedUserPref,
  minimizePrefsForStorage,
  unminimizePrefsFromStorage
} from '@/domain/user-preferences/compress-user-prefs';
import { UserPreference } from '@/domain/user-preferences/user-preferences';
import { Table as UntypedTable } from 'tinybase';
import { Content } from 'tinybase/store/with-schemas';
import {
  CloudStorageSynchronizer,
  RemoteRepresentation
} from '../abstract-synchronizer';
import {
  annotsConflictPolicy,
  collectionConflictPolicy,
  noConflictPolicy
} from '../merge-helpers/conflict-policies';
import {
  applyLocalChangesToPull,
  applyLocalChangesToPush,
  chainMerge
} from '../merge-helpers/merge-helpers';
import {
  annotsOrphanPolicy,
  collectionOrphanPolicy,
  noOrphanPolicy
} from '../merge-helpers/orphan-policies';
import { AfterMergeChange } from '../types';

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
  items: CollectionItem[];
  docAnnotations: DocAnnotation[];
  userPrefs: UserPreference[];
  lastRemoteChange: number;
  schemaVersion: number;
};

export const REMOTE_COLLECTION_SCHEMA_VERSION = 1; // increment each breaking change

const COL = 'collectionInfo';
export class CollectionSynchronizer extends CloudStorageSynchronizer {
  protected cloudFS: SingleFileStorage;
  protected ongoing = false;

  constructor(
    protected remote: RemoteRepresentation,
    protected driver: CloudStorageDriver
  ) {
    super();
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
    if (resp.replicaState.connected) {
      this.storeReplicaStateInfo(this.remote.id, resp.replicaState, COL);
    }
    return {
      config: resp.config,
      connected: resp.replicaState.connected || false
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
        this.updateRemoteState(this.remote.id, updatedRemoteState, true);
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
    const lastPulled = this.getLastPulled(this.remote.id, COL);

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
          this.remote.id,
          updatedRemoteState,
          force || false
        );
      }
      return { success: resp.success, didPull };
    } catch (e) {
      console.error('[collection][pull] error', this.remote.name, e);
      // TODO restore
    } finally {
      this.ongoing = false;
      console.log(`[collection][pull] done`);
    }
    return { success: false, didPull };
  }

  public async destroy() {
    return this.driver.close();
  }

  private async resolveRemoteContent(
    localContent: Content<SpaceType>,
    force: boolean
  ): Promise<RemoteContentRepresentation> {
    if (!force) {
      const lastPulled = this.getLastPulled(this.remote.id, COL);
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
    stopLocalChangesListeners();
    storageService.restoreContent(resp.content, resp.changes);
    startLocalChangesListeners();
    // this.setContent(resp.content);
    // this.handleResumeState(resp.changes);
    // this.handleHistory(resp.changes);
    // this.handleDeletedRows(resp.changes);
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
    changes: AfterMergeChange[];
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
          force
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
    const changes = storageService.afterSyncHistChanges(
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
    const annotation = this.toMap<DocAnnotation>(
      localContent[0].document_annotation
    );
    const userPreference = this.toMap<UserPreference>(
      localContent[0].user_preference
    );
    const items = [...collection.values()].filter(v => !v.conflictId);
    const docAnnotations = [...annotation.values()];
    const userPrefs = [...userPreference.values()];
    const lastRemoteChange = Math.max(
      ...items.map(i => i.updatedAt),
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
    updatedRemoteState: ReplicaState,
    clearLocalChanges: boolean
  ) {
    store.transaction(() => {
      if (clearLocalChanges) {
        localChangesService.clear();
      }
      this.storeReplicaStateInfo(state, updatedRemoteState, COL);
    });
  }

  private handleDiscardedChanges(discardedChanges: LocalChangeResult[]) {
    discardedChanges.forEach(localChange => {
      localChangesService.delete(localChange.id);
    });
  }
}
