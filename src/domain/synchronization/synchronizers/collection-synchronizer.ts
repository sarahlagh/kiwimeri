import { store } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { AnyData } from '@/core/db/types';
import {
  minimizeAnnotForStorage,
  MinimizedDocAnnotation,
  unminimizeAnnotFromStorage
} from '@/domain/collection/compress-annotations';
import {
  MinimizedCollectionItem,
  minimizeItemsForStorage,
  unminimizeItemsFromStorage
} from '@/domain/collection/compress-collection';
import { historyService } from '@/domain/history/history.service';
import { conflictsService } from '@/domain/space-merging/conflicts-service';
import {
  annotsConflictPolicy,
  collectionConflictPolicy,
  noConflictPolicy
} from '@/domain/space-merging/merge-helpers/conflict-policies';
import {
  applyLocalChangesToPull,
  applyLocalChangesToPush,
  chainMerge
} from '@/domain/space-merging/merge-helpers/merge-helpers';
import {
  annotsOrphanPolicy,
  collectionOrphanPolicy,
  noOrphanPolicy
} from '@/domain/space-merging/merge-helpers/orphan-policies';
import { toArray, toTable } from '@/domain/space-merging/merge-utils';
import { storageService } from '@/domain/space-merging/storage.service';
import {
  AfterMergeChange,
  SpacePortableData
} from '@/domain/space-merging/types';
import {
  startLocalChangesListeners,
  stopLocalChangesListeners
} from '@/domain/synchronization//local-changes-listeners';
import { CloudStorageDriver } from '@/domain/synchronization/drivers/abstract.driver';
import { SingleFileStorage } from '@/domain/synchronization/layouts/singlefile.filesystem';
import { LocalChangeResult } from '@/domain/synchronization/local-changes';
import localChangesService from '@/domain/synchronization/local-changes.service';
import { ReplicaState } from '@/domain/synchronization/replica-state';
import {
  MinimizedUserPref,
  minimizePrefsForStorage,
  unminimizePrefsFromStorage
} from '@/domain/user-preferences/compress-user-prefs';
import {
  CloudStorageSynchronizer,
  RemoteRepresentation
} from './abstract-synchronizer';

export type RemoteCollectionFileContent = {
  i: MinimizedCollectionItem[]; // the items
  a?: MinimizedDocAnnotation[]; // the document annotations
  o?: MinimizedUserPref[]; // the user preferences / options
  u: number; // last content change
  _v?: number; // the schema version (!= app version)
};

type RemoteContentRepresentation = SpacePortableData;

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
    try {
      // fetch remote if needed or use local content as comparison
      const remoteContent = await this.resolveRemoteContent(force);
      // compute data to send - merge local and remote
      const { hasNewChanges, data } = this.computeDataToPush(
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
    return this.toRepresentationFromLocal();
  }

  private computeDataToPush(
    localChanges: LocalChangeResult[],
    remoteContent: RemoteContentRepresentation,
    force: boolean
  ): { data: AnyData; hasNewChanges: boolean } {
    let lastLocalChange = remoteContent.lastChange;
    if (localChanges.length > 0) {
      lastLocalChange = Math.max(...localChanges.map(lc => lc.createdAt));
    }
    const localContent = storageService.getSpaceRepresentation();

    // merge collection
    applyLocalChangesToPush(
      localContent,
      SpaceTables.Collection,
      'items',
      localChanges,
      remoteContent.items
    );

    // merge annotations
    applyLocalChangesToPush(
      localContent,
      SpaceTables.Annotations,
      'annots',
      localChanges,
      remoteContent.annots
    );

    // merge user prefs
    applyLocalChangesToPush(
      localContent,
      SpaceTables.UserPreference,
      'userPrefs',
      localChanges,
      remoteContent.userPrefs
    );

    let data: RemoteCollectionFileContent;
    if (localChanges.length > 0 || force) {
      data = this.toFileContent(
        remoteContent,
        REMOTE_COLLECTION_SCHEMA_VERSION,
        lastLocalChange
      );
    } else {
      const localContentRep = this.toRepresentationFromLocal();
      data = this.toFileContent(
        localContentRep,
        localContentRep.schemaVersion,
        lastLocalChange
      );
    }
    return { hasNewChanges: localChanges.length > 0, data };
  }

  private applyMergeLocal(
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
      storageService.getSpaceRepresentation(),
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
    localContent: SpacePortableData,
    localChanges: LocalChangeResult[],
    obj: RemoteCollectionFileContent,
    force: boolean
  ): {
    content: SpacePortableData;
    discardedChanges: LocalChangeResult[];
    changes: AfterMergeChange[];
  } {
    const remoteContent = this.toRepresentation(obj);

    const { newLocalContent, discardedChanges } = chainMerge(localContent, [
      res =>
        applyLocalChangesToPull(
          SpaceTables.Collection,
          'items',
          res.newLocalContent,
          remoteContent,
          localChanges,
          collectionConflictPolicy,
          collectionOrphanPolicy,
          force
        ),
      res =>
        applyLocalChangesToPull(
          SpaceTables.Annotations,
          'annots',
          res.newLocalContent,
          remoteContent,
          localChanges,
          annotsConflictPolicy,
          annotsOrphanPolicy,
          force
        ),
      res =>
        applyLocalChangesToPull(
          SpaceTables.UserPreference,
          'userPrefs',
          res.newLocalContent,
          remoteContent,
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

  private toRepresentationFromLocal(): RemoteContentRepresentation {
    return storageService.getSpaceRepresentation(
      REMOTE_COLLECTION_SCHEMA_VERSION
    );
  }

  private toRepresentation(
    data: RemoteCollectionFileContent
  ): RemoteContentRepresentation {
    const obj = data;

    return {
      items: toTable(unminimizeItemsFromStorage(obj.i)),
      annots: toTable(unminimizeAnnotFromStorage(obj.a || [])),
      userPrefs: toTable(unminimizePrefsFromStorage(obj.o || [])),
      lastChange: obj.u,
      schemaVersion: obj._v || 0
    };
  }

  private toFileContent(
    remoteContent: RemoteContentRepresentation,
    schemaVersion: number,
    updated: number
  ): RemoteCollectionFileContent {
    return {
      i: minimizeItemsForStorage(toArray(remoteContent.items)),
      a: minimizeAnnotForStorage(toArray(remoteContent.annots)),
      o: minimizePrefsForStorage(toArray(remoteContent.userPrefs)),
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
