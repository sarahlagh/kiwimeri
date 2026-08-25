import { Network } from '@capacitor/network';
import { postInitMigrationService } from './core/db/post-init-migrations/post-init-migration.service';
import { space, store } from './core/db/store';
import { startDbListeners } from './core/db/store-listeners';
import { networkService } from './core/infra/network.service';
import { schedule } from './core/tasks/scheduler.service';
import notebooksService from './domain/collection/notebooks.service';
import { syncService } from './domain/synchronization/sync.service';

export function appInit() {
  console.debug('[app-init] app starting...');

  schedule.start();
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then(isPersisted => {
      console.debug(`[app-init] persisted storage granted: ${isPersisted}`);
    });
  }

  startDbListeners();

  setTimeout(async () => {
    await postInitMigrationService.start(store, space);
    const initialStatus = await Network.getStatus();
    console.debug('[app-init] got initial network status', initialStatus);
    networkService.init(initialStatus);

    notebooksService.initNotebooks();
    syncService.start();
    console.debug('[app-init] app started');
  });
}
