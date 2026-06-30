import { CollectionItem } from '@/domain/collection/collection';
import { SyncableAnnotation } from '@/domain/collection/doc-annotations';
import { historyService } from '@/domain/history/history.service';
import {
  startLocalChangesListeners,
  stopLocalChangesListeners
} from '@/domain/synchronization/local-changes-listeners';
import { CompositeSynchronizer } from '@/domain/synchronization/merging/synchronizers/composite-synchronizer';
import remotesService from '@/domain/synchronization/remotes.service';
import replicaService from '@/domain/synchronization/replica.service';
import {
  SyncDirection,
  syncService
} from '@/domain/synchronization/sync.service';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';
import { InMemDriver } from '@@/_setup/inmem.driver';
import { fakeTimersDelay } from '@@/_setup/test.utils';
import { expect, vi } from 'vitest';

export let driver: InMemDriver;
let iPull = 0;
let iPush = 0;

export const testSyncBeforeEach = async () => {
  stopLocalChangesListeners();
  remotesService.addRemote('test', 0, 'inmem', {
    names: ['collection.json']
  });
  await syncService.reinit(true);
  const compositeSynchronizer = replicaService['synchronizers'].values().next()
    .value! as CompositeSynchronizer;
  compositeSynchronizer['statsEnabled'] = false;
  driver = compositeSynchronizer['collectionSynchronizer'][
    'driver'
  ] as InMemDriver;
  vi.useFakeTimers();
  historyService['enabled'] = true;
  userPrefs.set('historyIdleTime', 0);
  startLocalChangesListeners();
};

export const testSyncAfterEach = () => {
  iPull = 0;
  iPush = 0;
  vi.useRealTimers();
  // expect(countOrphans()).toBe(0);
};

export const reInitRemoteData = async (items: CollectionItem[]) => {
  return reInitRemoteDataWithAnnots(items);
};

export const reInitRemoteDataWithAnnots = async (
  items: CollectionItem[],
  annots?: SyncableAnnotation[]
) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  // parent update doesn't set the row update ts, so... parentId_meta ts might be > i.updated
  // this is a test problem, lastLocalChange is supposed to be updated by localChanges service
  const lastLocalChange = Math.max(
    ...items.map(i => Math.max(i.updatedAt, i.parentId_meta._u))
  );
  console.debug('[reInitRemoteData]', items, annots, lastLocalChange);
  await driver.setCollectionContentWithAnnots(
    items,
    annots || [],
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
