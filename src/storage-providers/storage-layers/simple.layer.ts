import { CollectionItem } from '@/collection/collection';
import { SpaceType } from '@/db/types/db-types';
import { AnyData, LocalChange, LocalChangeType } from '@/db/types/store-types';
import { Content } from 'tinybase/with-schemas';
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
    remoteInfo: RemoteInfo,
    force = false
  ) {
    if (!this.provider.getConfig()) {
      throw new Error(`uninitialized ${this.provider.providerName} config`);
    }
    const { content } = await this.provider.pullFile(this.providerid);
    const collection = this.toMap<CollectionItem>(localContent[0].collection!);
    const newLocalContent = { ...localContent };
    newLocalContent[0].collection = {};
    content.forEach(item => {
      newLocalContent[0].collection![item.id!] = item;
    });

    if (!force && localChanges.length > 0) {
      // reapply localChanges
      for (const localChange of localChanges) {
        if (localChange.change !== LocalChangeType.delete) {
          newLocalContent[0].collection![localChange.item] = collection.get(
            localChange.item
          )!;
        } else {
          delete newLocalContent[0].collection[localChange.item];
        }
      }
    }
    console.debug('localChanges', localChanges);
    console.debug('newLocalContent', newLocalContent);

    return {
      content: newLocalContent,
      localBuckets,
      remoteInfo
    };
  }
}
