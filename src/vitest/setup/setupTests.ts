// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import { InMemProvider } from '@/storage-providers/inmem.provider';
import '@testing-library/jest-dom/extend-expect';
import storageService from '../../db/storage.service';

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
  await storageService.start(false);
});
afterAll(async () => {
  storageService.stop();
});
beforeEach(async () => {});
afterEach(async () => {
  new InMemProvider().reset();
  storageService.getStore().setContent([{}, {}]);
  storageService.getSpace().setContent([{}, {}]);
  expect(storageService.getStore().getRowCount('remotes')).toBe(0);
  expect(storageService.getSpace().getRowCount('collection')).toBe(0);
});
