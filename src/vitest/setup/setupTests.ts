// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import { initGlobalTrans } from '@/config';
import notebooksService from '@/db/notebooks.service';
import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import { messages as enMessages } from '@/locales/en/messages';
import { i18n } from '@lingui/core';
import '@testing-library/jest-dom/extend-expect';

// allow the log level to be applied to tests
import { historyService } from '@/db/collection-history.service';
import { migrationService } from '@/db/migrations/migration.service';
import '@/polyfills/log-polyfill';

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

beforeAll(async () => {
  migrationService['enabled'] = false;
  historyService['enabled'] = false;
  await storageService.start(false);
  await remotesService.initSync();
  i18n.load('en', enMessages);
  i18n.activate('en');
  initGlobalTrans();
  notebooksService.initNotebooks();
  expect(notebooksService.getCurrentNotebook()).toBe('0');
});
afterAll(() => {
  remotesService.stopSync();
  storageService.stop();
});
beforeEach(() => {});
afterEach(() => {
  storageService.reInitDB();
  notebooksService.initNotebooks();
  expect(notebooksService.getCurrentNotebook()).not.toBe('');
  expect(notebooksService.getNotebooks()).toHaveLength(1);
  expect(storageService.getStore().getRowCount('remotes')).toBe(0);
  expect(storageService.getSpace().getRowCount('collection')).toBe(1);
  remotesService.stopSync();
});
