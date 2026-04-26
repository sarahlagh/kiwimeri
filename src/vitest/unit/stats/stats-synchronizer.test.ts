import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { statsService } from '@/core/services/stats/stats-service';
import collectionService from '@/db/collection.service';
import { InMemDriver } from '@/remote-storage/storage-drivers/inmem.driver';
import {
  RemoteStatsFileContent,
  StatsSynchronizer
} from '@/remote-storage/synchronizers/stats-synchronizer';
import { describe, expect, test, vi } from 'vitest';
import { buildRandomFake } from './test-stats.utils';

const driver = new InMemDriver(['stats.json']);
const statsSynchronizer = new StatsSynchronizer(driver);

function initLocalDocAndStats(n: number, skipDays = false) {
  const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
  const fakeStats = buildRandomFake(n, skipDays);
  fakeStats.forEach(dataPoint => {
    statsService.updateStatsAtDate(docId, {
      lastCharCount: dataPoint.values.lastCharCount,
      lastWordCount: dataPoint.values.lastWordCount,
      updatedAt: dataPoint.values.updatedAt
    });
  });
  const now = Date.now();
  statsService.updateGlobalStats(docId, { lastOpenedAt: now });
  return { docId, now };
}

function initRemoteDocAndStats() {
  // TODO
}

describe('stats synchronizer', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    statsSynchronizer.destroy();
    const { connected } = await statsSynchronizer.connect();
    expect(connected).toBe(true);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('should push no stats if nothing on local', async () => {
    const resp = await statsSynchronizer.push();
    expect(resp.didPush).toBe(false);
    expect(resp.success).toBe(true);
    const remoteContent = driver.getParsedContent();
    expect(remoteContent).toBeNull();
  });

  test('should push local stats', async () => {
    // init local stats
    vi.setSystemTime('2026-04-20');
    const { docId: docId1, now: now1 } = initLocalDocAndStats(5);
    vi.setSystemTime('2026-04-26');
    const { docId: docId2, now: now2 } = initLocalDocAndStats(10);

    const resp = await statsSynchronizer.push();
    expect(resp.didPush).toBe(true);
    expect(resp.success).toBe(true);

    // check remote content
    const remoteContent = driver.getParsedContent<RemoteStatsFileContent>();
    expect(remoteContent).not.toBeNull();

    // content stats
    const content = remoteContent!.content;
    expect(content).toHaveLength(12);
    expect(content.map(c => c.date)).toEqual([
      '2026-04-15',
      '2026-04-16',
      '2026-04-17',
      '2026-04-18',
      '2026-04-19',
      '2026-04-20',
      '2026-04-21',
      '2026-04-22',
      '2026-04-23',
      '2026-04-24',
      '2026-04-25',
      '2026-04-26'
    ]);
    expect(content[0].stats[docId1].updatedAt).toBeDefined();
    expect(content[0].stats[docId2]).toBeUndefined();
    for (let i = 1; i < 6; i++) {
      expect(content[i].stats[docId1].updatedAt).toBeDefined();
      expect(content[i].stats[docId2].updatedAt).toBeDefined();
    }
    for (let i = 6; i < 12; i++) {
      expect(content[i].stats[docId1]).toBeUndefined();
      expect(content[i].stats[docId2].updatedAt).toBeDefined();
    }

    // global stats
    const global = remoteContent!.global;
    expect(Object.keys(global)).toHaveLength(2);
    expect(global[docId1].lastOpenedAt).toBe(now1);
    expect(global[docId2].lastOpenedAt).toBe(now2);
  });

  test('should pull local stats', async () => {
    // TODO
    initRemoteDocAndStats();
  });
});
