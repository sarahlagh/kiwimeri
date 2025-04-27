import { CollectionItem } from '@/collection/collection';
import { SpaceType } from '@/db/types/db-types';
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

type SimpleStorageInfo = {
  providerid: string;
  hash?: string; // can do with cachedRemoteInfo...
};

export class SimpleStorageProvider extends StorageProvider {
  protected readonly id = 'S';
  protected readonly version = 1;
  protected readonly filename = 'collection.json';
  protected localInfo!: SimpleStorageInfo;

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
        console.warn('version file is missing, may be the first push');
        // later: do something to warn user instead
        await this.driver.pushFile(this.getVersionFile(), '0');
      }
    }
    const remoteState = this.getRemoteState(filesInfo);
    this.localInfo = remoteState.info as SimpleStorageInfo;
    return {
      config,
      remoteState: { ...remoteState, connected }
    };
  }

  private getRemoteState(filesInfo: DriverFileInfo[]) {
    const remoteState: RemoteState = {
      connected: true,
      lastRemoteChange: Math.max(...filesInfo.map(fi => fi.updated))
    };
    if (filesInfo.length > 0) {
      remoteState.info = {
        providerid: filesInfo[0].providerid,
        hash: filesInfo[0].hash
      } as SimpleStorageInfo;
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

    const { filesInfo } = await this.driver.fetchFilesInfo([this.filename]);
    const newRemoteState = this.getRemoteState(filesInfo);
    const collection = this.toMap<CollectionItem>(localContent[0].collection!);
    let newRemoteContent: CollectionItem[];
    const newLastRemoteChange = newRemoteState.lastRemoteChange || 0;
    const cachedLastRemoteChange = cachedRemoteInfo.lastRemoteChange || 0;

    if (newLastRemoteChange > cachedLastRemoteChange && !force) {
      const { content: remoteContent } = await this.driver.pullFile(
        this.localInfo.providerid,
        this.filename
      );
      newRemoteContent = JSON.parse(remoteContent || '[]') as CollectionItem[];
    } else {
      newRemoteContent = collection
        .keys()
        .map(id => collection.get(id)!)
        .filter(v => !v.conflict)
        .toArray();
    }

    if (localChanges.length > 0) {
      // reapply local changes
      for (const localChange of localChanges) {
        const itemIdx = newRemoteContent.findIndex(
          ri => ri.id === localChange.item
        );
        if (itemIdx === -1 && localChange.change !== LocalChangeType.delete) {
          newRemoteContent.push(collection.get(localChange.item)!);
          continue;
        }
        if (itemIdx > -1) {
          if (localChange.change === LocalChangeType.update) {
            newRemoteContent[itemIdx] = collection.get(localChange.item)!;
          } else if (localChange.change === LocalChangeType.delete) {
            newRemoteContent.splice(itemIdx, 1);
          }
        }
      }
    }

    const content = this.serialization(newRemoteContent);
    const driverInfo = await this.driver.pushFile(this.filename, content);
    this.localInfo.providerid = driverInfo.providerid;
    this.localInfo.hash = driverInfo.hash;

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
    const newRemoteState = this.getRemoteState(filesInfo);
    const newLocalInfo = newRemoteState.info as SimpleStorageInfo;

    const { content } = await this.driver.pullFile(
      this.localInfo.providerid,
      this.filename
    );
    const items = JSON.parse(content || '[]') as CollectionItem[];
    const localCollection = this.toMap<CollectionItem>(
      localContent[0].collection
    );
    const newLocalContent: Content<SpaceType> = [{ collection: {} }, {}];
    items.forEach(item => {
      newLocalContent[0].collection![item.id!] = item;
    });

    if (!force && localChanges.length > 0) {
      // reapply localChanges
      for (const localChange of localChanges) {
        const remoteUpdated =
          (newLocalContent[0].collection![localChange.item]
            ?.updated as number) || 0;

        if (localChange.updated > remoteUpdated) {
          if (
            localChange.change !== LocalChangeType.delete ||
            localChange.field === 'parent'
          ) {
            newLocalContent[0].collection![localChange.item] =
              localCollection.get(localChange.item)!;
          } else if (this.localInfo.hash === newLocalInfo.hash) {
            delete newLocalContent[0].collection![localChange.item];
          }
        } else {
          const localItem = localCollection.get(localChange.item)!;
          if (localItem && !localItem.conflict) {
            newLocalContent[0].collection![getUniqueId()] = {
              ...localItem,
              conflict: localChange.item,
              created: Date.now(),
              updated: Date.now()
            };
          }
        }
      }
    }

    this.localInfo = newLocalInfo;
    return {
      content: newLocalContent,
      remoteInfo: {
        ...cachedRemoteInfo,
        ...newRemoteState
      }
    };
  }

  private serialization(items: CollectionItem[]) {
    return JSON.stringify(items);
  }
}
