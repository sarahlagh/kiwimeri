import {
  CollectionItem,
  CollectionItemType,
  CollectionItemUpdatableFieldEnum,
  parseFieldMeta
} from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import {
  CONFLICTS_NOTEBOOK_ID,
  KIWIMERI_MODEL_VERSION,
  ROOT_COLLECTION
} from '@/constants';
import {
  minimizeItemsForStorage,
  unminimizeItemsFromStorage
} from '@/db/compress-storage';
import localChangesService from '@/db/local-changes.service';
import notebooksService from '@/db/notebooks.service';
import { SpaceType } from '@/db/types/space-types';
import {
  AnyData,
  LocalChange,
  LocalChangeType,
  RemoteState
} from '@/db/types/store-types';
import { Row, Table } from 'tinybase/store';
import { Content, getUniqueId } from 'tinybase/with-schemas';
import {
  CloudStorageDriver,
  CloudStorageFilesystem,
  DriverFileInfo,
  RemoteInfo
} from '../sync-types';

type SingleFileStorageFileContent = {
  i: CollectionItem[]; // the items
  u: number; // last content change
  v: number; // the model version
};

export class SingleFileStorage extends CloudStorageFilesystem {
  protected readonly id = 'S';
  protected readonly version = 1;
  protected readonly filename = 'collection.json';

  public constructor(protected driver: CloudStorageDriver) {
    super(driver);
  }

  public getVersionFile() {
    return `${this.id}${this.version}`;
  }

  public configure(config: AnyData, proxy?: string, useHttp?: boolean) {
    this.driver.configure(config, proxy, useHttp);
  }

  public async connect() {
    const { config, connected, filesInfo } = await this.driver
      .connect([this.getVersionFile(), this.filename])
      .catch(() => ({ connected: false, config: null, filesInfo: null }));

    if (connected && filesInfo) {
      const idx = filesInfo.findIndex(
        f => f.filename === this.getVersionFile()
      );
      if (idx > -1) {
        filesInfo.splice(idx, 1);
      } else {
        console.warn('[init] version file is missing, may be the first push');
        // later: do something to warn user instead
        await this.driver.pushFile(this.getVersionFile(), '0');
      }
    }
    if (config && filesInfo) {
      const remoteState = this.getRemoteState(filesInfo);
      return {
        config,
        remoteState: { ...remoteState, connected }
      };
    }
    return { config, remoteState: { connected } };
  }

  private getRemoteState(filesInfo: DriverFileInfo[]) {
    const remoteState: RemoteState = {
      connected: true,
      lastRemoteChange:
        filesInfo.length > 0 ? Math.max(...filesInfo.map(fi => fi.updated)) : 0
    };
    if (filesInfo.length > 0) {
      remoteState.info = filesInfo[0];
    }
    return remoteState;
  }

  public async push(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    cachedRemoteInfo: RemoteInfo,
    force = false
  ) {
    if (!this.driver.getConfig()) {
      throw new Error(`uninitialized ${this.driver.driverName} config`);
    }

    // TODO should check if remote still connected here
    // TODO in case of pull-then-push don't fetchFilesInfo twice, but only once we have locking
    const { filesInfo } = await this.driver.fetchFilesInfo([this.filename]);

    console.debug('[push] filesInfo', filesInfo);
    const newRemoteState = this.getRemoteState(filesInfo);
    const localInfo = newRemoteState.info as DriverFileInfo;
    const collection = this.toMap<CollectionItem>(localContent[0].collection!);
    let newRemoteContent: CollectionItem[];
    const newLastRemoteChange = newRemoteState.lastRemoteChange || 0;
    const cachedLastRemoteChange = cachedRemoteInfo.lastRemoteChange || 0;
    const lastPulled = cachedRemoteInfo.lastPulled;

    if (!localInfo || lastPulled >= newLastRemoteChange || force) {
      console.debug(
        '[push] using local collection, not pulling',
        newLastRemoteChange,
        cachedLastRemoteChange
      );
      newRemoteContent = [...collection.values()].filter(v => !v.conflict);
    } else {
      console.debug(
        '[push] pulling new file due to cached remote being outdated',
        newLastRemoteChange,
        cachedLastRemoteChange
      );
      const { content: remoteContent } = await this.driver.pullFile(
        localInfo.providerid,
        this.filename
      );
      const obj = this.deserialization(remoteContent);
      newRemoteContent = obj.i;
    }

    let lastLocalChange = newLastRemoteChange;
    if (localChanges.length > 0) {
      lastLocalChange = Math.max(...localChanges.map(lc => lc.updated));
      // reapply local changes
      for (const localChange of localChanges) {
        const itemIdx = newRemoteContent.findIndex(
          ri => ri.id === localChange.item
        );
        console.debug('[push] handling local change', localChange, itemIdx);
        if (
          itemIdx === -1 &&
          localChange.change !== LocalChangeType.delete &&
          collection.has(localChange.item)
        ) {
          newRemoteContent.push(collection.get(localChange.item)!);
          continue;
        }
        if (itemIdx > -1) {
          if (localChange.change === LocalChangeType.update) {
            // local always wins
            newRemoteContent[itemIdx] = collection.get(localChange.item)!;
          } else if (localChange.change === LocalChangeType.delete) {
            newRemoteContent.splice(itemIdx, 1);
          }
        }
      }
    }

    if (localChanges.length > 0 || force) {
      const content = this.serialization(newRemoteContent, lastLocalChange);
      const driverInfo = await this.driver.pushFile(this.filename, content);
      newRemoteState.info = driverInfo;
      newRemoteState.lastRemoteChange = driverInfo.updated;
    }

    console.debug('[push] localInfo', localInfo);
    console.debug(
      '[push] pulled file',
      newLastRemoteChange > cachedLastRemoteChange && !force
    );
    console.debug('[push] cachedRemoteInfo', cachedRemoteInfo);
    console.debug('[push] newRemoteState', newRemoteState);
    return {
      remoteInfo: {
        ...cachedRemoteInfo,
        ...newRemoteState
      }
    };
  }

  public async pull(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    cachedRemoteInfo: RemoteInfo,
    force = false
  ) {
    if (!this.driver.getConfig()) {
      throw new Error(`uninitialized ${this.driver.driverName} config`);
    }

    const { filesInfo } = await this.driver.fetchFilesInfo([this.filename]);
    console.debug('[pull] filesInfo', filesInfo);
    const newRemoteState = this.getRemoteState(filesInfo);
    const newLocalInfo = newRemoteState.info as DriverFileInfo;
    const newLastRemoteChange = newRemoteState.lastRemoteChange || 0;
    const lastPulled = cachedRemoteInfo.lastPulled;

    if (!force && (!newLocalInfo || lastPulled >= newLastRemoteChange)) {
      console.debug('[pull] nothing to pull', newRemoteState);
      return {
        content: localContent,
        remoteInfo: cachedRemoteInfo
      };
    }

    const { content } = await this.driver.pullFile(
      newLocalInfo.providerid,
      this.filename
    );

    const obj = this.deserialization(content);
    const items = obj.i;
    const remoteContentUpdated = obj.u;
    console.debug('[pull] content from file: u', obj.u);
    const localCollection = this.toMap<CollectionItem>(
      localContent[0].collection
    );
    const newLocalContent: Content<SpaceType> = [{ collection: {} }, {}];
    items.forEach(item => {
      newLocalContent[0].collection![item.id!] = item;
    });
    const newLocalCollection = this.toMap<CollectionItem>(
      newLocalContent[0].collection
    );

    if (!force && localChanges.length > 0) {
      // reapply localChanges
      for (const localChange of localChanges) {
        let remoteUpdated = newLocalCollection.has(localChange.item)
          ? newLocalCollection.get(localChange.item)!.updated
          : remoteContentUpdated || 0;
        console.debug(
          '[pull] handling local change',
          localChange,
          remoteUpdated
        );

        // before reapply: if updated locally and still exists on remote, get remoteUpdated value
        if (
          localChange.change === LocalChangeType.update &&
          newLocalCollection.has(localChange.item)
        ) {
          const meta = newLocalCollection.get(localChange.item)![
            `${localChange.field as CollectionItemUpdatableFieldEnum}_meta`
          ];
          console.debug('[pull] local change meta', localChange.field, meta);
          remoteUpdated = parseFieldMeta(meta!).u;
        }

        // if added locally, add to newLocalContent
        if (localChange.change === LocalChangeType.add) {
          newLocalContent[0].collection![localChange.item] =
            localCollection.get(localChange.item)!;

          // if local change on item is more recent than remote
        } else if (localChange.updated > remoteUpdated) {
          // if is update
          if (localChange.change === LocalChangeType.update) {
            const field = localChange.field as CollectionItemUpdatableFieldEnum;
            // if doesn't exist on remote (has been deleted?) recreate it
            if (!newLocalContent[0].collection![localChange.item]) {
              newLocalContent[0].collection![localChange.item] =
                localCollection.get(localChange.item)!;
            } else {
              // if exists on remote, update the field, its meta, and preview if field was content
              newLocalContent[0].collection![localChange.item][field] =
                localCollection.get(localChange.item)![field];
              newLocalContent[0].collection![localChange.item][
                `${field}_meta`
              ] = localCollection.get(localChange.item)![`${field}_meta`];
              if (field === 'content') {
                newLocalContent[0].collection![localChange.item].preview =
                  localCollection.get(localChange.item)!.preview;
              }
            }
          } else {
            // is delete
            delete newLocalContent[0].collection![localChange.item];
          }
        } else {
          // if remote change on item is more recent than local
          const localItem = localCollection.get(localChange.item)!;
          // create conflict, only if item is not already a conflict and is a document or page
          // do not create conflict for folders and notebooks
          if (
            localItem &&
            !localItem.conflict &&
            localItem.type !== CollectionItemType.folder &&
            localItem.type !== CollectionItemType.notebook
          ) {
            newLocalContent[0].collection![getUniqueId()] = {
              ...{ ...localItem, id: undefined },
              conflict: localChange.item,
              created: Date.now(),
              updated: Date.now()
            };
          }
        }
      }

      this.checkOrphans(newLocalContent[0].collection!);
    }

    console.debug('[pull] newLocalInfo', newLocalInfo);
    console.debug('[pull] cachedRemoteInfo', cachedRemoteInfo);
    console.debug('[pull] newRemoteState', newRemoteState);

    return {
      content: newLocalContent,
      remoteInfo: {
        ...cachedRemoteInfo,
        ...newRemoteState
      }
    };
  }

  public async destroy() {
    this.driver.close();
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

      // if parent doesn't exist, put the item in conflicts notebook
      console.debug('orphan detected', id, item.title);
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

  private serialization(items: CollectionItem[], updated: number) {
    const obj: SingleFileStorageFileContent = {
      i: items,
      u: updated,
      v: KIWIMERI_MODEL_VERSION
    };
    return JSON.stringify({ ...obj, i: minimizeItemsForStorage(items) });
  }

  private deserialization(content?: string): SingleFileStorageFileContent {
    const obj = JSON.parse(content || '{}') as AnyData;

    if (obj.v !== KIWIMERI_MODEL_VERSION) {
      console.warn(
        '[filesystem] model mismatch between server and client',
        obj.v,
        KIWIMERI_MODEL_VERSION
      );
    }

    return {
      u: obj.u,
      i: unminimizeItemsFromStorage(obj.i),
      v: obj.v
    };
  }
}
