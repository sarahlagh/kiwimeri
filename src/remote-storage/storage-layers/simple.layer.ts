import { CollectionItem } from '@/collection/collection';
import { SpaceType } from '@/db/types/db-types';
import { AnyData, LocalChange, LocalChangeType } from '@/db/types/store-types';
import { Content, getUniqueId } from 'tinybase/with-schemas';
import {
  Bucket,
  FileStorageProvider,
  RemoteInfo,
  StorageLayer
} from '../types';

export class SimpleStorageLayer extends StorageLayer {
  protected readonly filename = 'bucket1.json';
  protected providerid!: string;

  public constructor(private provider: FileStorageProvider) {
    super();
  }

  public configure(config: AnyData, proxy?: string, useHttp?: boolean) {
    this.provider.configure(config, proxy, useHttp);
  }

  public async init(remoteStateId?: string) {
    const { config, connected, remoteState } =
      await this.provider.init(remoteStateId);
    if (remoteState.buckets.length > 0) {
      this.providerid = remoteState.buckets[0].providerid;
    }
    return {
      config,
      connected,
      remoteState
    };
  }

  public async push(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    localBuckets: Bucket[],
    remoteInfo: RemoteInfo
  ) {
    if (!this.provider.getConfig()) {
      throw new Error(`uninitialized ${this.provider.providerName} config`);
    }

    // const {
    //   content: remoteContent,
    //   localBuckets: newLocalBuckets,
    //   remoteInfo: newRemoteInfo
    // } = await this.pull(localContent, localChanges, localBuckets, remoteInfo);

    // for (const localChange of localChanges) {
    // }

    const collection = this.toMap<CollectionItem>(localContent[0].collection!);
    const content = JSON.stringify(
      collection
        .keys()
        .map(id => collection.get(id))
        .toArray()
    );
    this.providerid = await this.provider.pushFile(this.filename, content);

    console.debug('new remoteInfo in mem', content);
    return {
      localBuckets,
      remoteInfo
    };
  }

  public async pull(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    localBuckets: Bucket[],
    cachedRemoteInfo: RemoteInfo,
    force = false
  ) {
    if (!this.provider.getConfig()) {
      throw new Error(`uninitialized ${this.provider.providerName} config`);
    }
    const { remoteStateInfo: newRemoteState } =
      await this.provider.fetchRemoteStateInfo(cachedRemoteInfo.state);
    const { content } = await this.provider.pullFile(this.providerid);
    const localCollection = this.toMap<CollectionItem>(
      localContent[0].collection
    );
    const newLocalContent: Content<SpaceType> = [{ collection: {} }, {}];
    content.forEach(item => {
      newLocalContent[0].collection![item.id!] = item;
    });

    // console.debug('newLocalContent', newLocalContent);
    console.debug('newRemoteState', newRemoteState);
    console.debug('cached remote info', cachedRemoteInfo);
    // console.debug('local buckets', localBuckets);
    // console.debug('localChanges', localChanges);

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
          } else if (
            localBuckets.length < 1 ||
            localBuckets[0].hash === newRemoteState.buckets[0].hash
          ) {
            delete newLocalContent[0].collection![localChange.item];
          }
        } else {
          const localItem = localCollection.get(localChange.item)!;
          if (localItem && !localItem.conflict) {
            console.log(
              'conflict where server wins',
              localChange,
              localItem,
              remoteUpdated
            );
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

    return {
      content: newLocalContent,
      localBuckets: newRemoteState.buckets,
      remoteInfo: {
        ...newRemoteState,
        remoteItems: cachedRemoteInfo.remoteItems
      }
    };
  }
}
