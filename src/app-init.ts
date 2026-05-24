import { addAndroidListeners } from './capacitor/handle-android-plugins';
import { DEFAULT_SPACE_ID } from './constants';
import { space, store } from './core/db/store';
import { startListeners } from './core/db/store-listeners';
import { plt } from './core/infra/platform';
import { historyService } from './db/collection-history.service';
import { migrationService } from './db/migrations/migration.service';
import notebooksService from './db/notebooks.service';
import remotesService from './db/remotes.service';
import { appLog } from './log';
import { searchAncestryService } from './search/search-ancestry.service';

if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(isPersisted => {
    console.debug(`persisted storage granted: ${isPersisted}`);
  });
}

// catch close tab on web
window.onbeforeunload = savePending;
function savePending() {
  console.debug('onbeforeunload');
  historyService.saveNow();
  return undefined;
}

setTimeout(() => {
  console.debug('app starting...');
  console.debug('remaining timeouts', historyService['timeouts'].size);
  if (plt.isAndroid()) {
    addAndroidListeners();
  }
  startListeners();
  migrationService.start(store, space);
  notebooksService.initNotebooks();
  searchAncestryService.start(DEFAULT_SPACE_ID);
  historyService.start();
  remotesService.initSync();
  historyService.gc();
  appLog.gc(); // TODO run at interval
  console.debug('app started');
});
