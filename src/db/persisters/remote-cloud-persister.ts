import { RemoteInfo, StorageProvider } from '@/storage-providers/sync-core';
import { createCustomPersister } from 'tinybase/persisters/with-schemas';
import { Store } from 'tinybase/with-schemas';
import localChangesService from '../localChanges.service';
import remotesService from '../remotes.service';
import storageService from '../storage.service';
import { SpaceType } from '../types/db-types';
import { RemoteResult } from '../types/store-types';

const updateRemoteInfo = (state: string, remoteInfo: RemoteInfo) => {
  storageService.getStore().transaction(() => {
    localChangesService.setLastLocalChange(
      remoteInfo.remoteState.lastRemoteChange
    );
    localChangesService.clearLocalChanges();
    remotesService.updateRemoteStateInfo(state, remoteInfo.remoteState);
    remotesService.updateRemoteItemInfo(state, remoteInfo.remoteItems);
  });
};

export const createRemoteCloudPersister = (
  store: Store<SpaceType>,
  remote: RemoteResult,
  provider: StorageProvider
) => {
  return createCustomPersister(
    store,
    async () => {
      const localContent = store.getContent();
      const localChanges = localChangesService.getLocalChanges();
      if (provider) {
        console.log(`pulling from remote ${remote.name}`);
        const remoteState = remotesService.getCachedRemoteStateInfo(
          remote.state
        );
        const remoteItems = remotesService.getCachedRemoteItemInfo(
          remote.state
        );
        const resp = await provider.pull(localContent, localChanges, {
          remoteState,
          remoteItems
        });
        if (resp && resp.content) {
          updateRemoteInfo(remote.state, resp.remoteInfo);
          return resp.content;
        }
      }
      return localContent;
    },
    async getContent => {
      const localContent = getContent();
      const localChanges = localChangesService.getLocalChanges();
      const remoteState = remotesService.getCachedRemoteStateInfo(remote.state);
      const remoteItems = remotesService.getCachedRemoteItemInfo(remote.state);
      console.log(`pushing to remote ${remote.name} `);
      const resp = await provider.push(localContent, localChanges, {
        remoteState,
        remoteItems
      });
      updateRemoteInfo(remote.state, resp.remoteInfo);
    },
    listener => setInterval(listener, 1000),
    interval => clearInterval(interval)
  );
};
