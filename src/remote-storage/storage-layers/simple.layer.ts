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
  StorageLayer
} from '../sync-types';

type SimpleStorageInfo = {
  providerid: string;
  hash?: string; // can do with cachedRemoteInfo...
};

export class SimpleStorageLayer extends StorageLayer {
  protected readonly id = 'S';
  protected readonly version = 1;
  protected readonly filename = 'collection.json';
  protected localInfo!: SimpleStorageInfo;

  public constructor(private driver: FileStorageDriver) {
    super();
  }

  public getVersion() {
    return `${this.id}${this.version}`;
  }

  public configure(config: AnyData, proxy?: string, useHttp?: boolean) {
    this.driver.configure(config, proxy, useHttp);
  }

  public async init(remoteStateId?: string) {
    const { config, connected, filesInfo } = await this.driver.init([
      this.filename
    ]);
    const remoteState = this.getRemoteState(filesInfo, remoteStateId);
    this.localInfo = remoteState.info as SimpleStorageInfo;
    // TODO verify layer version?
    return {
      config,
      connected,
      remoteState
    };
  }

  // TODO is remoteStateId even needed?
  private getRemoteState(filesInfo: DriverFileInfo[], remoteStateId?: string) {
    const remoteState: RemoteState = {
      id: remoteStateId,
      connected: filesInfo.length > 0,
      lastRemoteChange: Math.max(...filesInfo.map(fi => fi.updated)),
      info: {
        providerid: filesInfo[0].providerid,
        hash: filesInfo[0].hash
      } as SimpleStorageInfo
    };
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
    const newRemoteState = this.getRemoteState(filesInfo, cachedRemoteInfo.id);

    const collection = this.toMap<CollectionItem>(localContent[0].collection!);
    let newRemoteContent: CollectionItem[];
    const newLastRemoteChange = newRemoteState.lastRemoteChange || 0;
    const cachedLastRemoteChange = cachedRemoteInfo.lastRemoteChange || 0;
    if (newLastRemoteChange > cachedLastRemoteChange && !force) {
      const { content: remoteContent } = await this.driver.pullFile(
        this.localInfo.providerid,
        this.filename
      );
      newRemoteContent = remoteContent;
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
    const driverInfo = await this.driver.pushFile(
      this.localInfo.providerid,
      this.filename,
      content
    );
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
    const newRemoteState = this.getRemoteState(filesInfo, cachedRemoteInfo.id);

    const newLocalInfo = newRemoteState.info as SimpleStorageInfo;
    console.debug('remoteStateInfo', newRemoteState);
    console.debug('cachedRemoteInfo', cachedRemoteInfo);

    const { content } = await this.driver.pullFile(
      this.localInfo.providerid,
      this.filename
    );
    const localCollection = this.toMap<CollectionItem>(
      localContent[0].collection
    );
    const newLocalContent: Content<SpaceType> = [{ collection: {} }, {}];
    content.forEach(item => {
      newLocalContent[0].collection![item.id!] = item;
    });

    console.debug('before newLocalContent', newLocalContent);
    if (!force && localChanges.length > 0) {
      console.debug(
        'local vs remote hash',
        this.localInfo.hash,
        (newRemoteState.info as SimpleStorageInfo).hash
      );

      // reapply localChanges
      for (const localChange of localChanges) {
        const remoteUpdated =
          (newLocalContent[0].collection![localChange.item]
            ?.updated as number) || 0;

        console.debug('localChange', localChange);
        console.debug('remoteUpdated', remoteUpdated);
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

    console.debug('after newLocalContent', newLocalContent);
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
