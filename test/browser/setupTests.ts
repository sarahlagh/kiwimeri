import '@ionic/react/css/core.css';
/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
/* Optional CSS utils that can be commented out */
import '@ionic/react/css/display.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
/* Dark Theme */
import '@ionic/react/css/palettes/dark.class.css';
/* global */
import '../../src/theme/global.scss';

import { initGlobalTrans } from '@/config';
import notebooksService from '@/db/notebooks.service';
import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import { messages as enMessages } from '@/locales/en/messages';
import { i18n } from '@lingui/core';

// allow the log level to be applied to tests
import { historyService } from '@/db/collection-history.service';
import { migrationService } from '@/db/migrations/migration.service';
import '@/polyfills/log-polyfill';
import { setupIonicReact } from '@ionic/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

i18n.load('en', enMessages);
i18n.activate('en');
initGlobalTrans();

setupIonicReact({
  sanitizerEnabled: true,
  animated: false
});

beforeAll(async () => {
  migrationService['enabled'] = false;
  historyService['enabled'] = false;
  await storageService.start(false);
  await remotesService.initSync();
  notebooksService.initNotebooks();
});
afterAll(() => {
  remotesService.stopSync();
  storageService.stop();
});
beforeEach(() => {});
afterEach(() => {
  storageService.reInitDB();
  notebooksService.initNotebooks();
  remotesService.stopSync();
});
