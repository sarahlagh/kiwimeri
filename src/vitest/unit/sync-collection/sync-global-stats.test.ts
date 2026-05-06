import { DEFAULT_NOTEBOOK_ID } from '@/constants';

import collectionService from '@/db/collection.service';
import { AllGlobalStatsBag, statsService } from '@/domain/stats/stats-service';
import {
  getRowCountInsideNotebook,
  oneDocument,
  oneFolder,
  oneNotebook
} from '@/vitest/setup/test.utils';
import { describe, test, vi } from 'vitest';
import {
  getRemoteContent,
  reInitRemoteData,
  syncService_sync,
  testSyncAfterEach,
  testSyncBeforeEach
} from './test-sync.utils';

describe('global stats sync tests', () => {
  beforeEach(testSyncBeforeEach);
  afterEach(testSyncAfterEach);

  test('no global stats on remote, new client pushes them', async () => {
    const remoteData = [
      oneDocument(),
      oneDocument(),
      oneFolder(),
      oneNotebook()
    ];
    const docId = remoteData[0].id!;
    await reInitRemoteData(remoteData);
    const resp1 = await syncService_sync('sync');
    expect(resp1.success);
    expect(resp1.didPull);
    expect(!resp1.didPush);
    expect(getRowCountInsideNotebook()).toBe(3);

    expect(statsService.getAllGlobalStats()).toEqual({});
    const lastOpenedAt = Date.now();
    statsService.updateGlobalStats(docId, { lastOpenedAt });

    // global stats don't trigger push on their own
    const resp2 = await syncService_sync('sync');
    expect(resp2.success);
    expect(!resp1.didPull);
    expect(!resp1.didPush);
    expect(statsService.getAllGlobalStats()[docId].lastOpenedAt).toBe(
      lastOpenedAt
    );

    // new item to push
    collectionService.addFolder(DEFAULT_NOTEBOOK_ID);

    const resp3 = await syncService_sync('sync');
    expect(resp3.success);
    expect(!resp3.didPull);
    expect(resp3.didPush);

    const remoteContent = await getRemoteContent();
    expect(remoteContent.global).toBeDefined();
    expect(remoteContent.global[docId].lastOpenedAt).toBe(lastOpenedAt);
  });

  test('global stats on remote, new client downloads them', async () => {
    const remoteData = [
      oneDocument(),
      oneDocument(),
      oneFolder(),
      oneNotebook()
    ];
    const docId = remoteData[0].id!;
    const remoteGS: AllGlobalStatsBag = {};
    remoteGS[docId] = { lastOpenedAt: Date.now() };
    await reInitRemoteData(remoteData, undefined, undefined, remoteGS);
    expect(statsService.getAllGlobalStats()).toEqual({});

    const resp = await syncService_sync('sync');
    expect(resp.success);
    expect(resp.didPull);
    expect(!resp.didPush);

    const globalStats = statsService.getAllGlobalStats();
    expect(globalStats[docId]).toBeDefined();
    expect(globalStats[docId].lastOpenedAt).toBe(remoteGS[docId].lastOpenedAt);
  });

  test('global stats on remote, new client updates and merges them if more recent', async () => {
    const remoteData = [
      oneDocument(),
      oneDocument(),
      oneFolder(),
      oneNotebook()
    ];
    const docId = remoteData[0].id!;
    const remoteGS: AllGlobalStatsBag = {};
    remoteGS[docId] = { lastOpenedAt: Date.now() };
    await reInitRemoteData(remoteData, undefined, undefined, remoteGS);
    vi.advanceTimersByTime(1000);
    const localUpdate = Date.now();
    statsService.updateGlobalStats(docId, { lastOpenedAt: localUpdate });

    const resp = await syncService_sync('sync');
    expect(resp.success);
    expect(resp.didPull);
    expect(!resp.didPush);

    const globalStats = statsService.getAllGlobalStats();
    expect(globalStats[docId]).toBeDefined();
    expect(globalStats[docId].lastOpenedAt).toBe(localUpdate);
  });

  test('global stats on remote, new client updates and preserves them if older ', async () => {
    const remoteData = [
      oneDocument(),
      oneDocument(),
      oneFolder(),
      oneNotebook()
    ];
    const docId = remoteData[0].id!;
    const remoteGS: AllGlobalStatsBag = {};
    remoteGS[docId] = { lastOpenedAt: Date.now() };
    await reInitRemoteData(remoteData, undefined, undefined, remoteGS);
    vi.advanceTimersByTime(1000);
    const localUpdate = Date.now() - 60000;
    statsService.updateGlobalStats(docId, { lastOpenedAt: localUpdate });

    const resp = await syncService_sync('sync');
    expect(resp.success);
    expect(resp.didPull);
    expect(!resp.didPush);

    const globalStats = statsService.getAllGlobalStats();
    expect(globalStats[docId]).toBeDefined();
    expect(globalStats[docId].lastOpenedAt).toBe(remoteGS[docId].lastOpenedAt);
  });
});
