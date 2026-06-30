// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom

import notebooksService from '@/db_to_migrate/notebooks.service';
import { messages as enMessages } from '@/locales/en/messages';
import { i18n } from '@lingui/core';

// allow the log level to be applied to tests
import { initGlobalTrans } from '@/constants';
import { postInitMigrationService } from '@/core/db/post-init-migrations/post-init-migration.service';
import { startDbListeners, stopDbListeners } from '@/core/db/store-listeners';
import '@/core/infra/polyfills/log-polyfill';
import { historyService } from '@/domain/history/history.service';
import localChangesService from '@/domain/synchronization/local-changes/local-changes.service';
import { syncService } from '@/domain/synchronization/sync.service';
import { afterAll, afterEach, beforeAll, beforeEach, expect } from 'vitest';
import { nukeStorage } from './test.utils';

// Mock matchmedia
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {}
    };
  };

i18n.load('en', enMessages);
i18n.activate('en');
initGlobalTrans();

beforeAll(async () => {
  postInitMigrationService['enabled'] = false;
  historyService['enabled'] = false;
  syncService.start();
});
afterAll(() => {
  //
});
beforeEach(() => {
  startDbListeners();
  localChangesService.clear();
  notebooksService.initNotebooks();
  expect(notebooksService.getCurrentNotebook()).toBe('0');
});
afterEach(() => {
  stopDbListeners();
  nukeStorage();
  syncService.stop();
});
