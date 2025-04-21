// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
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
  await storageService.start();
});
afterAll(async () => {
  storageService.stop();
});
beforeEach(async () => {});
afterEach(async () => {
  storageService.getStore().setContent([{}, {}]);
  storageService.getSpace().setContent([{}, {}]);
});
