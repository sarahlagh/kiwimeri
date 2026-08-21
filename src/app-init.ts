import { Network } from '@capacitor/network';
import { postInitMigrationService } from './core/db/post-init-migrations/post-init-migration.service';
import { space, store } from './core/db/store';
import { startDbListeners } from './core/db/store-listeners';
import { networkService } from './core/infra/network.service';
import { appLog } from './core/logs/logs.service';
import { schedule } from './core/tasks/scheduler.service';
import notebooksService from './domain/collection/notebooks.service';
import { historyService } from './domain/history/history.service';
import { syncService } from './domain/synchronization/sync.service';

export function appInit() {
  console.debug('[app-init] app starting...');
  console.debug(
    '[app-init] remaining timeouts',
    historyService['timeouts'].size
  );

  schedule.start();
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then(isPersisted => {
      console.debug(`[app-init] persisted storage granted: ${isPersisted}`);
    });
  }

  // catch close tab on web
  window.onbeforeunload = savePending;
  function savePending() {
    console.debug('onbeforeunload');
    historyService.saveNow();
    return undefined;
  }

  startDbListeners();

  setTimeout(async () => {
    await postInitMigrationService.start(store, space);
    const initialStatus = await Network.getStatus();
    console.debug('[app-init] got initial network status', initialStatus);
    networkService.init(initialStatus);

    notebooksService.initNotebooks();
    syncService.start();
    historyService.gc();
    historyService.compact();
    appLog.gc(); // TODO run at interval
    console.debug('[app-init] app started');
  });
}
