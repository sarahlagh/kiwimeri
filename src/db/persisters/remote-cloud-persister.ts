import { Bucket, RemoteInfo, StorageLayer } from '@/remote-storage/types';
import { createCustomPersister } from 'tinybase/persisters/with-schemas';
import { Store } from 'tinybase/with-schemas';
import localChangesService from '../localChanges.service';
import remotesService from '../remotes.service';
import storageService from '../storage.service';
import { SpaceType } from '../types/db-types';
import { RemoteResult } from '../types/store-types';

const updateRemoteInfo = (
  state: string,
  localBuckets: Bucket[],
  remoteInfo: RemoteInfo
) => {
  storageService.getStore().transaction(() => {
    localChangesService.setLastLocalChange(remoteInfo.lastRemoteChange);
    localChangesService.setLocalBuckets(localBuckets);
    localChangesService.clearLocalChanges();
    remotesService.updateRemoteStateInfo(state, remoteInfo);
    remotesService.updateRemoteItemInfo(state, remoteInfo.remoteItems);
  });
};

export const createRemoteCloudPersister = (
  store: Store<SpaceType>,
  remote: RemoteResult,
  storageLayer: StorageLayer
) => {
  return createCustomPersister(
    store,
    // pull
    async () => {
      const localContent = store.getContent();
      const localChanges = localChangesService.getLocalChanges();
      const localBuckets = localChangesService.getLocalBuckets();
      if (storageLayer) {
        console.log(`pulling from remote ${remote.name}`);
        const remoteState = remotesService.getCachedRemoteStateInfo(
          remote.state
        );
        const remoteItems = remotesService.getCachedRemoteItemInfo(
          remote.state
        );
        const resp = await storageLayer.pull(
          localContent,
          localChanges,
          localBuckets,
          {
            ...remoteState,
            remoteItems
          }
        );
        if (resp && resp.content) {
          updateRemoteInfo(remote.state, resp.localBuckets, resp.remoteInfo);
          return resp.content;
        }
      }
      return localContent;
    },
    // push
    async getContent => {
      const localContent = getContent();
      const localChanges = localChangesService.getLocalChanges();
      const localBuckets = localChangesService.getLocalBuckets();
      const remoteState = remotesService.getCachedRemoteStateInfo(remote.state);
      const remoteItems = remotesService.getCachedRemoteItemInfo(remote.state);
      console.log(`pushing to remote ${remote.name} `);
      const resp = await storageLayer.push(
        localContent,
        localChanges,
        localBuckets,
        {
          ...remoteState,
          remoteItems
        }
      );
      updateRemoteInfo(remote.state, resp.localBuckets, resp.remoteInfo);
    },
    listener => setInterval(listener, 1000),
    interval => clearInterval(interval)
  );
};
