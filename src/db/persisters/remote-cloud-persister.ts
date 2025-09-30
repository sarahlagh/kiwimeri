import { RemoteInfo, StorageProvider } from '@/remote-storage/sync-types';
import { createCustomPersister } from 'tinybase/persisters/with-schemas';
import { Store } from 'tinybase/with-schemas';
import localChangesService from '../local-changes.service';
import remotesService from '../remotes.service';
import storageService from '../storage.service';
import { SpaceType } from '../types/space-types';
import { RemoteResult } from '../types/store-types';

const updateRemoteInfo = (
  state: string,
  remoteInfo: RemoteInfo,
  updateLocalChanges: boolean,
  clearLocalChanges: boolean
) => {
  storageService.getStore().transaction(() => {
    if (updateLocalChanges) {
      localChangesService.setLastLocalChange(remoteInfo.lastRemoteChange || 0);
    }
    if (clearLocalChanges) {
      localChangesService.clear();
    }
    remotesService.updateRemoteStateInfo(state, remoteInfo);
    if (remoteInfo.remoteItems) {
      remotesService.updateRemoteItemInfo(state, remoteInfo.remoteItems);
    }
  });
};

export const createRemoteCloudPersister = (
  store: Store<SpaceType>,
  remote: RemoteResult,
  storageProvider: StorageProvider
) => {
  return createCustomPersister(
    store,
    // pull
    async () => {
      const localContent = store.getContent();
      const localChanges = localChangesService.getLocalChanges();
      const lastPulled = localChangesService.getLastPulled();
      const force = remotesService.getForceMode();
      const remoteState = remotesService.getCachedRemoteStateInfo(remote.state);
      const remoteItems = remotesService.getCachedRemoteItemInfo(remote.state);
      try {
        const resp = await storageProvider.pull(
          localContent,
          localChanges,
          {
            ...remoteState,
            remoteItems,
            lastPulled
          },
          force
        );
        if (resp && resp.content) {
          updateRemoteInfo(
            remote.state,
            resp.remoteInfo,
            force || localChanges.length == 0,
            force || false
          );
          localChangesService.setLastPulled(Date.now());
          return resp.content;
        }
      } catch (e) {
        console.error('error pulling', storageProvider?.getName(), e);
      }
      return localContent;
    },
    // push
    async getContent => {
      const localContent = getContent();
      const localChanges = localChangesService.getLocalChanges();
      const lastPulled = localChangesService.getLastPulled();
      const remoteState = remotesService.getCachedRemoteStateInfo(remote.state);
      const remoteItems = remotesService.getCachedRemoteItemInfo(remote.state);
      const force = remotesService.getForceMode();
      try {
        const resp = await storageProvider.push(
          localContent,
          localChanges,
          {
            ...remoteState,
            remoteItems,
            lastPulled
          },
          force
        );
        updateRemoteInfo(remote.state, resp.remoteInfo, true, true);
        if (force) localChangesService.setLastPulled(Date.now());
      } catch (e) {
        console.error('error pushing', storageProvider.getName(), e);
      }
    },
    listener => setInterval(listener, 1000),
    interval => clearInterval(interval)
  );
};
