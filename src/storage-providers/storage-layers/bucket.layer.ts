import { CollectionItem } from '@/collection/collection';
import { SpaceType } from '@/db/types/db-types';
import { LocalChange } from '@/db/types/store-types';
import { Content } from 'tinybase/with-schemas';
import {
  Bucket,
  FileStorageProvider,
  RemoteInfo,
  RemoteStateInfo,
  StorageLayer
} from '../types';

export class BucketStorageLayer extends StorageLayer {
  private readonly bucketMaxSize = 2000000;

  public constructor(private provider: FileStorageProvider) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public configure(conf: any, proxy?: string, useHttp?: boolean): void {
    this.provider.configure(conf, proxy, useHttp);
  }

  public async init(remoteStateId?: string) {
    return this.provider.init(remoteStateId);
  }

  protected async getRemoteContent(
    localContent: Content<SpaceType>,
    localBuckets: Bucket[],
    remoteInfo: RemoteInfo
  ) {
    if (!this.provider.getConfig()) {
      throw new Error(`uninitialized ${this.provider.providerName} config`);
    }
    const newLocalBuckets = [...localBuckets];
    const remoteContent: Content<SpaceType> = [{ collection: {} }, {}];
    // fetch new remoteInfo from pcloud, update this.remoteInfo
    const { remoteStateInfo: newRemoteState } =
      await this.provider.fetchRemoteStateInfo(remoteInfo.state);

    // determine which existing buckets have changed locally
    const bucketsUpdatedRemotely: Bucket[] = [];
    const bucketsUnchanged: Bucket[] = [];
    for (const bucket of localBuckets) {
      const remoteBucketObj = newRemoteState.buckets?.find(
        b => b.providerid === bucket.providerid
      );
      if (remoteBucketObj) {
        if (remoteBucketObj.lastRemoteChange > bucket.lastRemoteChange) {
          bucketsUpdatedRemotely.push(bucket);
        } else {
          bucketsUnchanged.push(bucket);
        }
      }
    }
    for (const remoteBucket of newRemoteState.buckets) {
      const localBucketObj = localBuckets.find(
        b => b.providerid === remoteBucket.providerid
      );
      // if remote bucket doesn't exist yet, pull it
      if (!localBucketObj) {
        newLocalBuckets.push(remoteBucket);
        bucketsUpdatedRemotely.push(remoteBucket);
      }
    }
    // fetch only those buckets from provider
    for (const bucket of bucketsUpdatedRemotely) {
      const { content } = await this.provider.pullFile(bucket.providerid);
      for (const item of content as CollectionItem[]) {
        remoteContent[0].collection![item.id!] = item;
        const remoteItem = remoteInfo.remoteItems.find(i => i.item === item.id);
        if (!remoteItem) {
          remoteInfo.remoteItems.push({
            item: item.id!,
            bucket: bucket.rank,
            state: remoteInfo.state!
          });
        }
      }
    }
    // complete collection with unchanged buckets
    for (const bucket of bucketsUnchanged) {
      const items = remoteInfo.remoteItems.filter(
        i => i.bucket === bucket.rank
      );
      for (const item of items) {
        remoteContent[0].collection![item.id!] =
          localContent[0].collection![item.id!];
      }
    }

    // TODO update remoteItems

    // what to do about deleted buckets remotely?
    // how do i know if something has been deleted from remote, or if it has never been pushed?
    console.debug('reconstitued db', remoteContent);
    return {
      remoteContent,
      localBuckets: newLocalBuckets,
      remoteInfo
    };
  }

  public async push(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    localBuckets: Bucket[],
    remoteInfo: RemoteInfo,
    force = false
  ) {
    if (!this.provider.getConfig()) {
      throw new Error(`uninitialized ${this.provider.providerName} config`);
    }
    const {
      remoteContent,
      localBuckets: newLocalBuckets,
      remoteInfo: newRemoteInfo
    } = await this.getRemoteContent(localContent, localBuckets, remoteInfo);
    const mergedContent = localContent; // TODO

    console.debug('push with force', force);
    console.debug('localContent', localContent);
    console.debug('localChanges', localChanges);
    console.debug('remoteContent', remoteContent);
    console.debug('mergedContent', mergedContent);
    console.debug('remoteMetadata from db', remoteInfo);
    console.debug('newRemoteInfo from provider', newRemoteInfo);

    // determine which buckets need to be pushed
    const bucketsToPush = new Set<number>();
    for (const localChange of localChanges) {
      const item = localChange.item;
      // does item have a bucket?
      const remoteItem = remoteInfo.remoteItems.find(ri => ri.item === item);
      if (remoteItem && remoteItem.bucket) {
        bucketsToPush.add(remoteItem.bucket);
      } else {
        // if not, assign a bucket
        const bucket = await this.assignBucket(remoteInfo);
        bucketsToPush.add(bucket);
        if (remoteItem) {
          remoteInfo.remoteItems.find(ri => ri.item === item)!.bucket = bucket;
        } else {
          remoteInfo.remoteItems.push({
            item,
            bucket,
            state: remoteInfo.state!
          });
        }
      }
    }

    const collection = this.toMap<CollectionItem>(localContent[0].collection!);
    console.log('buckets to push', bucketsToPush);
    for (const bucket of bucketsToPush) {
      const rowIds = remoteInfo.remoteItems
        .filter(i => i.bucket === bucket)
        .map(i => i.item);
      console.log('pushing bucket', bucket, rowIds);
      const bucketContent = JSON.stringify(
        rowIds.map(id => collection.get(id))
      );
      await this.provider.pushFile(`bucket${bucket}.json`, bucketContent);
      // TODO for newly created buckets, update remoteInfo.buckets & local buckets
    }

    // TODO update lastRemoteChange on remoteState
    console.debug('new remoteInfo in mem', remoteInfo);
    return {
      localBuckets: newLocalBuckets,
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
    console.debug('pull with force', force, remoteInfo);
    // TODO if localChanges, do something

    const {
      remoteContent,
      localBuckets: newLocalBuckets,
      remoteInfo: newRemoteInfo
    } = await this.getRemoteContent(localContent, localBuckets, remoteInfo);

    console.debug('localContent', localContent);
    console.debug('localChanges', localChanges);
    console.debug('localBuckets', localBuckets);
    console.debug('newLocalBuckets', newLocalBuckets);
    console.debug('remoteContent', remoteContent);
    console.debug('remoteMetadata from db', remoteInfo);
    console.debug('newRemoteInfo from provider', newRemoteInfo);

    return {
      content: remoteContent,
      localBuckets: newLocalBuckets,
      remoteInfo
    };
  }

  protected async assignBucket(remoteState: RemoteStateInfo) {
    let i = 1;
    if (!remoteState.buckets) {
      remoteState.buckets = [];
    }
    // for each existing bucket: is there room left?
    for (const bucket of remoteState.buckets) {
      i++;
      // TODO estimate bucket size with content not uploaded yet
      if (bucket.size < this.bucketMaxSize) {
        return bucket.rank;
      }
    }
    console.debug('need to create a new bucket', i);
    return i;
  }
}
