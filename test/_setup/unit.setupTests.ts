// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';

import notebooksService from '@/db/notebooks.service';
import remotesService from '@/db/remotes.service';
import { messages as enMessages } from '@/locales/en/messages';
import { i18n } from '@lingui/core';

// allow the log level to be applied to tests
import { initGlobalTrans } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import { migrationService } from '@/db/migrations/migration.service';
import '@/polyfills/log-polyfill';
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
  migrationService['enabled'] = false;
  historyService['enabled'] = false;
  remotesService.initSync();
});
afterAll(() => {
  remotesService.stopSync();
});
beforeEach(() => {
  notebooksService.initNotebooks();
  expect(notebooksService.getCurrentNotebook()).toBe('0');
});
afterEach(() => {
  nukeStorage();
  remotesService.stopSync();
});
