import { CollectionItem } from '@/collection/collection';
import { SpaceType } from '@/db/types/db-types';
import { LocalChange } from '@/db/types/store-types';
import {
  RemoteBucket,
  RemoteInfo,
  RemoteStateInfo,
  StorageProvider
} from '@/storage-providers/sync-core';
import { Table as UntypedTable } from 'tinybase';
import { Content } from 'tinybase/with-schemas';
import {
  PCloudLinkResponse,
  PCloudListResponse,
  PCloudResult,
  PCloudUploadResponse
} from './types';

export type PCloudConf = {
  username: string;
  password: string;
  serverLocation: 'us' | 'eu';
  path?: string;
  folderid?: string;
};

export class KMPCloudClient implements StorageProvider {
  private proxy?: string;
  private config: PCloudConf | null = null;
  private serverUrl!: string;
  private readonly bucketMaxSize = 2000000;

  private api = {
    us: 'api.pcloud.com',
    eu: 'eapi.pcloud.com'
  };

  public configure(config: PCloudConf, proxy?: string, useHttp?: boolean) {
    this.config = config;
    if (!this.config.folderid && !this.config.path) {
      this.config.path = '/';
    }
    const protocol = useHttp ? 'http' : 'https';
    this.serverUrl = `${protocol}://${this.api[this.config.serverLocation]}`;
    this.proxy = proxy;
    if (proxy) {
      if (proxy.endsWith('/')) {
        this.proxy = proxy.substring(0, proxy.length - 1);
      }
      this.serverUrl = `${this.proxy}/${this.serverUrl}`;
    }
    console.log('[pCloud] server url', this.serverUrl);
    console.log('[pCloud] client configured', {
      ...this.config,
      password: '*******'
    });
  }

  private async fetchRemoteStateInfo(state?: string) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    const remoteStateInfo: RemoteStateInfo = {
      lastRemoteChange: 0,
      state,
      buckets: []
    };
    let res: PCloudListResponse;
    if (!this.config.folderid) {
      res = await this.getFetch<PCloudListResponse>('listfolder', {
        path: this.config.path
      });
    } else {
      res = await this.getFetch<PCloudListResponse>('listfolder', {
        folderid: this.config.folderid
      });
    }
    if (res.result !== PCloudResult.ok) {
      console.error('[pCloud] error:', res);
      return { ok: false, remoteStateInfo };
    }
    this.config.folderid = `${res.metadata!.folderid!}`;
    if (res.metadata?.contents) {
      remoteStateInfo.buckets = res.metadata.contents
        .filter(f => !f.isfolder && f.name.match(/bucket(\d*).json/))
        .map(f => ({
          rank: this.parseRank(f.name),
          providerid: `${f.fileid}`,
          size: f.size,
          hash: f.hash,
          lastRemoteChange: 0
        }));
    }
    console.log('[pCloud] connection tested OK');
    return { ok: true, remoteStateInfo };
  }

  private parseRank(fname: string) {
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

  public async init(spaceId?: string, remoteStateId?: string) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }

    const { ok, remoteStateInfo: remoteState } =
      await this.fetchRemoteStateInfo(remoteStateId);

    console.log('[pCloud] client initialized', {
      ...this.config,
      password: '*******'
    });
    console.debug('new remoteStateInfo returned', remoteState);

    return {
      connected: ok,
      config: this.config,
      remoteState
    };
  }

  public async getRemoteContent(
    localContent: Content<SpaceType>,
    remoteInfo: RemoteInfo
  ) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    const remoteContent: Content<SpaceType> = [{ collection: {} }, {}];
    // fetch new remoteInfo from pcloud, update this.remoteInfo
    const { remoteStateInfo: newRemoteState } = await this.fetchRemoteStateInfo(
      remoteInfo.remoteState.state
    );

    // determine which existing buckets have changed locally
    const bucketsUpdatedRemotely: RemoteBucket[] = [];
    const bucketsUnchanged: RemoteBucket[] = [];
    for (const bucket of remoteInfo.remoteState.buckets || []) {
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
    // fetch only those buckets from provider
    for (const bucket of bucketsUpdatedRemotely) {
      const { content } = await this.pullItem(bucket.providerid);
      for (const item of content as CollectionItem[]) {
        remoteContent[0].collection![item.id!] = item;
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

    // what to do about deleted buckets remotely?
    // how do i know if something has been deleted from remote, or if it has never been pushed?
    console.debug('reconstitued db', remoteContent);
    return { remoteContent, remoteState: newRemoteState };
  }

  public async merge(
    localContent: Content<SpaceType>,
    remoteContent: Content<SpaceType>,
    remoteInfo: RemoteInfo
  ) {
    // how do i know they've just never been pushed? => if they've never been pushed, they don't have a bucket assigned
    // how do i know that nodes (hard) deleted locally aren't missing from the diff with remote, that they need to stay removed?
    // i should keep track of local changes
    return localContent;
  }

  public async push(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    remoteInfo: RemoteInfo,
    force = false
  ) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    const { remoteContent, remoteState: newRemoteState } =
      await this.getRemoteContent(localContent, remoteInfo);
    remoteInfo.remoteState = newRemoteState;
    const mergedContent = await this.merge(
      localContent,
      remoteContent,
      remoteInfo
    );

    console.debug('push with force', force);
    console.debug('localContent', localContent);
    console.debug('localChanges', localChanges);
    console.debug('remoteContent', remoteContent);
    console.debug('mergedContent', mergedContent);
    console.debug('remoteMetadata from db', remoteInfo);
    console.debug('newRemoteState from provider', newRemoteState);

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
        const bucket = await this.assignBucket(remoteInfo.remoteState);
        bucketsToPush.add(bucket);
        if (remoteItem) {
          remoteInfo.remoteItems.find(ri => ri.item === item)!.bucket = bucket;
        } else {
          remoteInfo.remoteItems.push({
            item,
            bucket,
            state: remoteInfo.remoteState.state!
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
      await this.pushItem(
        `bucket${bucket}.json`,
        this.config.folderid!,
        bucketContent
      );
      // TODO for newly created buckets, update remoteInfo.remoteState.buckets
    }

    console.debug('new remoteInfo in mem', remoteInfo);
    return { remoteInfo };
  }

  private async assignBucket(remoteState: RemoteStateInfo) {
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

  public async pull(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    remoteInfo: RemoteInfo,
    force = false
  ) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    // on first pull, it might not exist
    if (!this.remoteInfo.info || !this.remoteInfo.lastRemoteChange) {
      return { content: localContent, remoteInfo };
    }
    console.debug('pull with force', force, remoteInfo);

    // if (!remoteInfo.info) {
    //   return { remoteInfo };
    // }
    // const content = await this.downloadFile(this.r);
    // const content = {}; // TODO
    // TODO update remoteLastModified too
    // remoteInfo = {
    //   lastRemoteChange: this.remoteLastModified,
    //   info: this.versionInfo, // TODO
    //   remoteItems: [] // TODO
    // };
    return { content: localContent, remoteInfo }; // TODO content
  }

  private async pushItem(filename: string, folderid: string, content: string) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    const resp = await this.uploadFile(content, filename, folderid);
    if (resp.result !== PCloudResult.ok || resp.metadata.length === 0) {
      console.log('[pCloud] error uploading changes');
      // TODO handle error
    }

    // TODO individual last modified VS global last modified?
  }

  private async updateVersion(folderid: string) {
    const resp = await this.uploadFile(
      new Date().toISOString(),
      'version.txt',
      folderid
    );
    const modified = new Date(resp.metadata[0].modified).getTime();
    if (this.remoteInfo.buckets) {
      const bucketIdx = this.remoteInfo.buckets.findIndex(
        b => b.bucket === folderid
      );
      if (bucketIdx !== -1) {
        this.remoteInfo.buckets[bucketIdx].lastRemoteChange = modified;
      }
    } else {
      this.remoteInfo.lastRemoteChange = modified;
    }
  }

  public async pullItem(providerid: string) {
    if (!this.config) {
      throw new Error('uninitialized pcloud config');
    }
    const content = await this.downloadFile(providerid);
    return { content };
  }

  private async downloadFile(fileid: string) {
    console.log('[pCloud] fetching file link');
    const res = await this.getFetch<PCloudLinkResponse>('getfilelink', {
      fileid: fileid,
      skipfilename: '1'
    });
    const linkUrl = `https://${res.hosts[0]}${res.path}`;
    const url = this.proxy ? `${this.proxy}/${linkUrl}` : linkUrl;
    // download file content
    console.log('[pCloud] downloading file');
    const data = await fetch(url);
    return await data.json();
  }

  private async uploadFile(
    content: string,
    filename: string,
    folderid: string
  ) {
    const res = await fetch(
      `${this.getUrl('uploadfile')}&folderid=${folderid}&filename=${filename}&nopartial=1`,
      {
        method: 'PUT',
        body: content,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return (await res.json()) as PCloudUploadResponse;
  }

  private async getFetch<T>(
    opName: string,
    params?: {
      path?: string;
      fileid?: string;
      folderid?: string;
      skipfilename?: string;
      name?: string;
    }
  ) {
    const path = params?.path ? `&path=${params?.path}` : '';
    const fileid = params?.fileid ? `&fileid=${params?.fileid}` : '';
    const folderid = params?.folderid ? `&folderid=${params?.folderid}` : '';
    const name = params?.name ? `&name=${params?.name}` : '';
    const skipfilename = params?.skipfilename
      ? `&skipfilename=${params?.skipfilename}`
      : '';
    const res = await fetch(
      `${this.getUrl(opName)}${fileid}${folderid}${path}${name}${skipfilename}`
    );
    return (await res.json()) as T;
  }

  private getUrl(opName: string) {
    return `${this.serverUrl}/${opName}?username=${this.config!.username}&password=${this.config!.password}`;
  }
}
