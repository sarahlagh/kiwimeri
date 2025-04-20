import { CollectionItem } from '@/collection/collection';
import { SpaceType } from '@/db/types/db-types';
import { AnyData, LocalChange } from '@/db/types/store-types';
import {
  Bucket,
  RemoteInfo,
  RemoteStateInfo,
  StorageProvider
} from '@/storage-providers/sync-core';
import { Table as UntypedTable } from 'tinybase';
import { Content } from 'tinybase/with-schemas';

export abstract class BucketStorageProvider implements StorageProvider {
  private readonly bucketMaxSize = 2000000;
  private providerName: string;

  public constructor(providerName: string) {
    this.providerName = providerName;
  }

  public abstract configure(
    config: AnyData,
    proxy?: string,
    useHttp?: boolean
  ): void;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public abstract getConfig(): any | null;

  protected abstract fetchRemoteStateInfo(
    state?: string
  ): Promise<{ ok: boolean; remoteStateInfo: RemoteStateInfo }>;

  protected abstract pushItem(filename: string, content: string): Promise<void>;

  protected abstract pullItem(
    providerid: string
  ): Promise<{ content: CollectionItem[] }>;

  public async init(remoteStateId?: string) {
    const { ok, remoteStateInfo: remoteState } =
      await this.fetchRemoteStateInfo(remoteStateId);

    console.log(`${this.providerName} client initialized`, {
      ...this.getConfig(),
      password: '*******'
    });
    console.debug('new remoteStateInfo returned', remoteState);

    return {
      config: this.getConfig(),
      connected: ok,
      remoteState
    };
  }

  protected async getRemoteContent(
    localContent: Content<SpaceType>,
    localBuckets: Bucket[],
    remoteInfo: RemoteInfo
  ) {
    if (!this.getConfig()) {
      throw new Error(`uninitialized ${this.providerName} config`);
    }
    const newLocalBuckets = [...localBuckets];
    const remoteContent: Content<SpaceType> = [{ collection: {} }, {}];
    // fetch new remoteInfo from pcloud, update this.remoteInfo
    const { remoteStateInfo: newRemoteState } = await this.fetchRemoteStateInfo(
      remoteInfo.state
    );

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
      const { content } = await this.pullItem(bucket.providerid);
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
    if (!this.getConfig()) {
      throw new Error(`uninitialized ${this.providerName} config`);
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
      await this.pushItem(`bucket${bucket}.json`, bucketContent);
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
    if (!this.getConfig()) {
      throw new Error(`uninitialized ${this.providerName} config`);
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

  protected parseRank(fname: string) {
    const match = fname.match(/bucket(\d*).json/);
    try {
      if (match && match.length > 1) {
        return parseInt(match[1]);
      }
    } catch (e) {
      console.debug('error parsing file name', e);
    }
    return 0;
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

  private toMap<T>(obj: UntypedTable) {
    const map: Map<string, T> = new Map();
    Object.keys(obj).forEach(id => {
      map.set(id, { ...(obj[id] as unknown as T), id });
    });
    return map;
  }
}
