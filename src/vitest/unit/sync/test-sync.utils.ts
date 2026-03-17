import { CollectionItem, parseFieldMeta } from '@/collection/collection';
import { DEFAULT_SPACE_ID } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import { SpaceValues } from '@/db/types/space-types';
import userSettingsService from '@/db/user-settings.service';
import { InMemDriver } from '@/remote-storage/storage-drivers/inmem.driver';
import { LayerTypes } from '@/remote-storage/storage-filesystem.factory';
import { syncService } from '@/remote-storage/sync.service';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { fakeTimersDelay } from '@/vitest/setup/test.utils';
import { vi } from 'vitest';

export let driver: InMemDriver;
let iPull = 0;
let iPush = 0;

const defaultValues: SpaceValues = {
  defaultSortBy: 'order',
  defaultSortDesc: true,
  historyDebounceTime: 60000,
  lastUpdated: Date.now(),
  schemaVersion: ''
};

export const testSyncBeforeEach = async () => {
  remotesService['layer'] = 'singlefile' as LayerTypes;
  remotesService.addRemote('test', 0, 'inmem', {});
  await remotesService.configureRemotes(storageService.getSpaceId(), true);
  driver = remotesService['filesystems'].values().next().value![
    'driver'
  ] as InMemDriver;
  vi.useFakeTimers();
  searchAncestryService.start(DEFAULT_SPACE_ID);
  historyService['enabled'] = true;
  userSettingsService.setHistoryDebounceTime(0);
};

export const testSyncAfterEach = () => {
  iPull = 0;
  iPush = 0;
  vi.useRealTimers();
  searchAncestryService.stop();
  // expect(countOrphans()).toBe(0);
};

export const reInitRemoteData = async (
  items: CollectionItem[],
  updateTs?: number,
  values?: SpaceValues
) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  // parent update doesn't set the row update ts, so... parent_meta ts might be > i.updated
  // this is a test problem, lastLocalChange is supposed to be updated by localChanges service
  const lastLocalChange =
    updateTs !== undefined
      ? updateTs
      : Math.max(
          ...items.map(i =>
            Math.max(i.updated, parseFieldMeta(i.parent_meta).u)
          )
        );
  if (!values) {
    values = {
      ...defaultValues,
      defaultSortBy: 'created',
      defaultSortDesc: false,
      lastUpdated: 0
    };
  }
  console.debug('[reInitRemoteData]', items, values, lastLocalChange);
  await driver.setContent(items, values, lastLocalChange);
  vi.advanceTimersByTime(fakeTimersDelay);
};

export const getRemoteContent = async () => {
  return driver.getParsedContent();
};

export const syncService_pull = async (force = false) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('start pulling', ++iPull, Date.now());
  const ok = await syncService.pull(undefined, force);
  expect(ok).toBe(true);
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('done pulling', Date.now());
};

export const syncService_push = async (force = false) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('start pushing', ++iPush, Date.now());
  await syncService.push(undefined, force);
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('done pushing', Date.now());
};
