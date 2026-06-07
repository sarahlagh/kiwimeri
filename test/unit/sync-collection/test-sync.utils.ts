import { CollectionItem } from '@/collection/collection';
import { DEFAULT_SPACE_ID } from '@/constants';
import { space } from '@/core/db/store';
import { SpaceValues } from '@/core/db/store-schema';
import { historyService } from '@/db/collection-history.service';
import remotesService from '@/db/remotes.service';
import { SyncableAnnotation } from '@/domain/document-annotations/model';
import { SyncDirection, syncService } from '@/remote-storage/sync.service';
import { CompositeSynchronizer } from '@/remote-storage/synchronizers/composite-synchronizer';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { InMemDriver } from '@@/_setup/inmem.driver';
import { fakeTimersDelay } from '@@/_setup/test.utils';
import { expect, vi } from 'vitest';

export let driver: InMemDriver;
let iPull = 0;
let iPush = 0;

export const defaultValues: SpaceValues = {
  defaultSortBy: 'order',
  defaultSortDesc: true,
  historyIdleTime: 15000,
  historyMaxInterval: 300000,
  maxHistoryPerDoc: 50,
  valuesLastUpdatedAt: Date.now(),
  schemaVersion: '',
  statsEnabled: false
};

export const testSyncBeforeEach = async () => {
  remotesService.addRemote('test', 0, 'inmem', { names: ['collection.json'] });
  await remotesService.configureRemotes(DEFAULT_SPACE_ID, true);
  const compositeSynchronizer = remotesService['synchronizers'].values().next()
    .value! as CompositeSynchronizer;
  compositeSynchronizer['statsEnabled'] = false;
  driver = compositeSynchronizer['collectionSynchronizer'][
    'driver'
  ] as InMemDriver;
  vi.useFakeTimers();
  searchAncestryService.start(DEFAULT_SPACE_ID);
  historyService['enabled'] = true;
  space.setValue('historyIdleTime', 0);
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
  return reInitRemoteDataWithAnnots(items, undefined, updateTs, values);
};

export const reInitRemoteDataWithAnnots = async (
  items: CollectionItem[],
  annots?: SyncableAnnotation[],
  updateTs?: number,
  values?: SpaceValues
) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  // parent update doesn't set the row update ts, so... parent_meta ts might be > i.updated
  // this is a test problem, lastLocalChange is supposed to be updated by localChanges service
  const lastLocalChange =
    updateTs !== undefined
      ? updateTs
      : Math.max(...items.map(i => Math.max(i.updated, i.parent_meta._u)));
  if (!values) {
    values = {
      ...defaultValues,
      defaultSortBy: 'created',
      defaultSortDesc: false,
      valuesLastUpdatedAt: 0
    };
  }
  console.debug('[reInitRemoteData]', items, annots, values, lastLocalChange);
  await driver.setCollectionContentWithAnnots(
    items,
    annots || [],
    values,
    lastLocalChange
  );
  vi.advanceTimersByTime(fakeTimersDelay);
};

export const getRemoteContent = async () => {
  return driver.getParsedCollectionContent();
};

export const getRemoteFileInfo = async (filename: string) => {
  return (await driver.getFileInfo({ filename })).fileInfo;
};

export const syncService_pull = async (force = false) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('start pulling', ++iPull, Date.now());
  const resp = await syncService.pull(undefined, force);
  expect(resp.success).toBe(true);
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('done pulling', Date.now());
  return resp;
};

export const syncService_sync = async (direction: SyncDirection) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('start syncing', ++iPull, Date.now());
  const resp = await syncService.sync(direction);
  expect(resp.success).toBe(true);
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('done syncing', Date.now());
  return resp;
};

export const syncService_push = async (force = false) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('start pushing', ++iPush, Date.now());
  const resp = await syncService.push(undefined, force);
  expect(resp.success).toBe(true);
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('done pushing', Date.now());
  return resp;
};
