import {
  CollectionItem,
  CollectionItemUpdatableFieldEnum
} from '@/collection/collection';
import { SpaceType } from '@/db/types/space-types';
import {
  AnyData,
  LocalChange,
  LocalChangeType,
  RemoteState
} from '@/db/types/store-types';
import { Content, getUniqueId } from 'tinybase/with-schemas';
import {
  DriverFileInfo,
  FileStorageDriver,
  RemoteInfo,
  StorageProvider
} from '../sync-types';

type SimpleStorageFileContent = {
  i: CollectionItem[]; // the items
  u: number; // last content change
};

export class SimpleStorageProvider extends StorageProvider {
  protected readonly id = 'S';
  protected readonly version = 1;
  protected readonly filename = 'collection.json';

  public constructor(protected driver: FileStorageDriver) {
    super(driver);
  }

  public getVersionFile() {
    return `${this.id}${this.version}`;
  }

  public configure(config: AnyData, proxy?: string, useHttp?: boolean) {
    this.driver.configure(config, proxy, useHttp);
  }

  public async init() {
    const { config, connected, filesInfo } = await this.driver.init([
      this.getVersionFile(),
      this.filename
    ]);
    if (connected) {
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
    const remoteState = this.getRemoteState(filesInfo);
    return {
      config,
      remoteState: { ...remoteState, connected }
    };
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
    const { filesInfo } = await this.driver.fetchFilesInfo([this.filename]);

    console.debug('[push] filesInfo', filesInfo);
    const newRemoteState = this.getRemoteState(filesInfo);
    const localInfo = newRemoteState.info as DriverFileInfo;
    const collection = this.toMap<CollectionItem>(localContent[0].collection!);
    let newRemoteContent: CollectionItem[];
    const newLastRemoteChange = newRemoteState.lastRemoteChange || 0;
    const cachedLastRemoteChange = cachedRemoteInfo.lastRemoteChange || 0;

    if (newLastRemoteChange > cachedLastRemoteChange && localInfo && !force) {
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
    } else {
      console.debug(
        '[push] using local collection, not pulling',
        newLastRemoteChange,
        cachedLastRemoteChange
      );
      newRemoteContent = [...collection.values()].filter(v => !v.conflict);
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

    const content = this.serialization(newRemoteContent, lastLocalChange);
    const driverInfo = await this.driver.pushFile(this.filename, content);
    newRemoteState.info = driverInfo;

    console.debug('[push] localInfo', localInfo);
    console.debug('[push] collection', collection);
    console.debug(
      '[push] pulled file',
      newLastRemoteChange > cachedLastRemoteChange && !force
    );
    console.debug('[push] newRemoteContent', newRemoteContent);
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

    if (!newLocalInfo) {
      console.debug('[pull] newLocalInfo is undefined');
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
    console.debug('[pull] content from file: i', obj.i);
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
        if (
          localChange.change === LocalChangeType.update &&
          newLocalCollection.has(localChange.item)
        ) {
          const meta = newLocalCollection.get(localChange.item)![
            `${localChange.field as CollectionItemUpdatableFieldEnum}_meta`
          ];
          console.debug('[pull] local change meta', meta);
          remoteUpdated = JSON.parse(meta!).updated;
        }

        if (localChange.change === LocalChangeType.add) {
          newLocalContent[0].collection![localChange.item] =
            localCollection.get(localChange.item)!;
        } else if (localChange.updated > remoteUpdated) {
          if (
            localChange.change !== LocalChangeType.delete ||
            localChange.field === 'parent'
          ) {
            const field = localChange.field as CollectionItemUpdatableFieldEnum;
            newLocalContent[0].collection![localChange.item][field] =
              localCollection.get(localChange.item)![field];
            newLocalContent[0].collection![localChange.item][`${field}_meta`] =
              localCollection.get(localChange.item)![`${field}_meta`];
          } else {
            delete newLocalContent[0].collection![localChange.item];
          }
        } else {
          const localItem = localCollection.get(localChange.item)!;
          if (
            localItem &&
            !localItem.conflict
            // && localItem.type === CollectionItemType.document
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
    }

    console.debug('[pull] newLocalInfo', newLocalInfo);
    console.debug(
      '[pull] newLocalContent',
      newLocalContent,
      JSON.stringify(newLocalContent)
    );
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

  private serialization(items: CollectionItem[], updated: number) {
    const obj: SimpleStorageFileContent = {
      i: items,
      u: updated
    };
    return JSON.stringify(obj);
  }

  private deserialization(content?: string) {
    return JSON.parse(content || '{}') as SimpleStorageFileContent;
  }
}
