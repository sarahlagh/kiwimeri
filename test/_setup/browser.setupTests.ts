import '@ionic/react/css/core.css';
/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
/* Optional CSS utils that can be noteed out */
import '@ionic/react/css/display.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
/* Dark Theme */
import '@ionic/react/css/palettes/dark.class.css';
/* global */
import '@/theme/global.scss';

import notebooksService from '@/domain/collection/notebooks.service';
import { messages as enMessages } from '@/locales/en/messages';
import { i18n } from '@lingui/core';

// allow the log level to be applied to tests
import { initGlobalTrans } from '@/constants';
import { postInitMigrationService } from '@/core/db/post-init-migrations/post-init-migration.service';
import { startDbListeners, stopDbListeners } from '@/core/db/store-listeners';
import '@/core/infra/polyfills/log-polyfill';
import { historyService } from '@/domain/history/history.service';
import { syncService } from '@/domain/synchronization/sync.service';
import { setupIonicReact } from '@ionic/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { nukeStorage } from './test.utils';

i18n.load('en', enMessages);
i18n.activate('en');
initGlobalTrans();

setupIonicReact({
  sanitizerEnabled: true,
  animated: false
});

beforeAll(async () => {
  postInitMigrationService['enabled'] = false;
  historyService['enabled'] = false;
  syncService.start();
});
afterAll(() => {
  //
});
beforeEach(() => {
  notebooksService.initNotebooks();
  startDbListeners();
});
afterEach(() => {
  stopDbListeners();
  nukeStorage();
  syncService.stop();
});
