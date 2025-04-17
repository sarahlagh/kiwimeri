import { StorageProvider } from '@/storage-providers/sync-core';
import { createCustomPersister } from 'tinybase/persisters/with-schemas';
import { Store } from 'tinybase/with-schemas';
import { remotesService } from '../remotes.service';
import storageService from '../storage.service';
import { SpaceType } from '../types/db-types';
import { RemoteResult } from '../types/store-types';

export const createRemoteCloudPersister = (
  store: Store<SpaceType>,
  remote: RemoteResult,
  provider: StorageProvider
) => {
  return createCustomPersister(
    store,
    async () => {
      const localContent = store.getContent();
      if (provider) {
        console.log(`pulling from remote ${remote.name}`);
        const resp = await provider.pull();
        if (resp && resp.content) {
          storageService.getStore().transaction(() => {
            storageService.setLastLocalChange(resp.lastRemoteChange!);
            remotesService.setLastRemoteChange(
              remote.state,
              resp.lastRemoteChange!
            );
          });
          return resp.content;
        }
      }
      return localContent;
    },
    async getContent => {
      const localContent = getContent();
      console.log(`pushing to remote ${remote.name} `);
      const lastModified = await provider.push(JSON.stringify(localContent));
      storageService.getStore().transaction(() => {
        storageService.setLastLocalChange(lastModified);
        remotesService.setLastRemoteChange(
          remote.state,
          lastModified as number
        );
      });
    },
    listener => setInterval(listener, 1000),
    interval => clearInterval(interval)
  );
};
