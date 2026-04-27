import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { statsService } from '@/core/services/stats/stats-service';
import collectionService from '@/db/collection.service';
import { InMemDriver } from '@/remote-storage/storage-drivers/inmem.driver';
import {
  RemoteStatsFileContent,
  StatsSynchronizer
} from '@/remote-storage/synchronizers/stats-synchronizer';
import { fakeTimersDelay } from '@/vitest/setup/test.utils';
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
      '2026-04-26',
      '2026-04-25',
      '2026-04-24',
      '2026-04-23',
      '2026-04-22',
      '2026-04-21',
      '2026-04-20',
      '2026-04-19',
      '2026-04-18',
      '2026-04-17',
      '2026-04-16',
      '2026-04-15'
    ]);
    content.reverse();
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

  test('should pull remote stats', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const remoteContent: RemoteStatsFileContent = {
      content: [{ date: '2024-03-31', stats: {} }],
      global: {}
    };
    const tsAtDate = new Date('2024-03-31').getTime();
    remoteContent.global[docId] = { lastOpenedAt: tsAtDate };
    remoteContent.content[0].stats[docId] = {
      maxWordCount: 1500,
      lastWordCount: 498,
      updatedAt: tsAtDate
    };
    driver.setContent(remoteContent);

    expect(statsService.getDataPoints(docId)).toHaveLength(0);

    // pull
    vi.advanceTimersByTime(fakeTimersDelay);
    const resp = await statsSynchronizer.pull();
    expect(resp.didPull).toBe(true);
    expect(resp.success).toBe(true);

    const contentStats = statsService.getDataPoints(docId);
    const globalStats = statsService.getGlobalStats(docId);
    expect(contentStats).toHaveLength(1);
    expect(contentStats[0].date).toBe('2024-03-31');
    expect(contentStats[0].values).toEqual({
      maxWordCount: 1500,
      maxCharCount: 0,
      lastWordCount: 498,
      updatedAt: tsAtDate
    });
    expect(globalStats.lastOpenedAt).toBe(tsAtDate);
  });

  test('should pull remote stats and merge with global stats if remote more recent', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const remoteContent: RemoteStatsFileContent = {
      content: [],
      global: {}
    };
    const tsAtDate = new Date('2024-03-31').getTime();
    remoteContent.global[docId] = { lastOpenedAt: tsAtDate };
    driver.setContent(remoteContent);

    statsService.updateGlobalStats(docId, {
      lastOpenedAt: new Date('2024-03-30').getTime() // remote is more recent
    });

    // pull
    vi.advanceTimersByTime(fakeTimersDelay);
    const resp = await statsSynchronizer.pull();
    expect(resp.didPull).toBe(true);
    expect(resp.success).toBe(true);

    const globalStats = statsService.getGlobalStats(docId);
    expect(globalStats.lastOpenedAt).toBe(tsAtDate);
  });

  test('should pull remote stats and merge with global stats if remote less recent', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const remoteContent: RemoteStatsFileContent = {
      content: [],
      global: {}
    };
    const tsAtDate = new Date('2024-03-31').getTime();
    remoteContent.global[docId] = { lastOpenedAt: tsAtDate };
    driver.setContent(remoteContent);

    const newTsAtDate = new Date('2024-04-01').getTime();
    statsService.updateGlobalStats(docId, {
      lastOpenedAt: newTsAtDate // remote is less recent
    });

    // pull
    vi.advanceTimersByTime(fakeTimersDelay);
    const resp = await statsSynchronizer.pull();
    expect(resp.didPull).toBe(true);
    expect(resp.success).toBe(true);

    const globalStats = statsService.getGlobalStats(docId);
    expect(globalStats.lastOpenedAt).toBe(newTsAtDate);
  });

  test('should pull remote stats and merge with content stats if remote more recent', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const remoteContent: RemoteStatsFileContent = {
      content: [{ date: '2024-03-31', stats: {} }],
      global: {}
    };
    const remoteTsAtDate = new Date('2024-03-31').getTime() + 60000;
    remoteContent.content[0].stats[docId] = {
      maxWordCount: 1500,
      lastWordCount: 498,
      maxCharCount: 15000,
      lastCharCount: 4980,
      updatedAt: remoteTsAtDate
    };
    driver.setContent(remoteContent);

    const localTsAtDate = new Date('2024-03-31').getTime() + 1000; // remote is more recent
    statsService.updateStatsAtDate(docId, {
      lastWordCount: 1600, // max
      lastCharCount: 16000,
      updatedAt: localTsAtDate - 100
    });
    statsService.updateStatsAtDate(docId, {
      lastWordCount: 900,
      lastCharCount: 9000,
      updatedAt: localTsAtDate
    });

    // pull
    vi.advanceTimersByTime(fakeTimersDelay);
    const resp = await statsSynchronizer.pull();
    expect(resp.didPull).toBe(true);
    expect(resp.success).toBe(true);

    const contentStats = statsService.getDataPoints(docId);
    expect(contentStats).toHaveLength(1);
    expect(contentStats[0].date).toBe('2024-03-31');
    expect(contentStats[0].values).toEqual({
      maxWordCount: 1600,
      maxCharCount: 16000,
      lastWordCount: 498,
      lastCharCount: 4980,
      updatedAt: remoteTsAtDate
    });
    const globalStats = statsService.getGlobalStats(docId);
    expect(globalStats.lastOpenedAt).toBe(0);
  });

  test('should pull remote stats and merge with content stats if remote less recent', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const remoteContent: RemoteStatsFileContent = {
      content: [{ date: '2024-03-31', stats: {} }],
      global: {}
    };
    const remoteTsAtDate = new Date('2024-03-31').getTime() + 1000;
    remoteContent.content[0].stats[docId] = {
      maxWordCount: 1500,
      lastWordCount: 498,
      maxCharCount: 15000,
      lastCharCount: 4980,
      updatedAt: remoteTsAtDate
    };
    driver.setContent(remoteContent);

    const localTsAtDate = new Date('2024-03-31').getTime() + 60000; // local is more recent
    statsService.updateStatsAtDate(docId, {
      lastWordCount: 1400, // max
      lastCharCount: 14000,
      updatedAt: localTsAtDate - 100
    });
    statsService.updateStatsAtDate(docId, {
      lastWordCount: 900,
      lastCharCount: 9000,
      updatedAt: localTsAtDate
    });

    // pull
    vi.advanceTimersByTime(fakeTimersDelay);
    const resp = await statsSynchronizer.pull();
    expect(resp.didPull).toBe(true);
    expect(resp.success).toBe(true);

    const contentStats = statsService.getDataPoints(docId);
    expect(contentStats).toHaveLength(1);
    expect(contentStats[0].date).toBe('2024-03-31');
    expect(contentStats[0].values).toEqual({
      maxWordCount: 1500,
      maxCharCount: 15000,
      lastWordCount: 900,
      lastCharCount: 9000,
      updatedAt: localTsAtDate
    });
    const globalStats = statsService.getGlobalStats(docId);
    expect(globalStats.lastOpenedAt).toBe(0);
  });

  test('should pull remote stats and merge even when most recent has stat undefined', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const remoteContent: RemoteStatsFileContent = {
      content: [{ date: '2024-03-31', stats: {} }],
      global: {}
    };
    const remoteTsAtDate = new Date('2024-03-31').getTime() + 60000;
    remoteContent.content[0].stats[docId] = {
      maxWordCount: 1500,
      lastWordCount: 498,
      updatedAt: remoteTsAtDate
    }; // char count not tracked on remote
    driver.setContent(remoteContent);

    const localTsAtDate = new Date('2024-03-31').getTime() + 1000; // remote is more recent
    statsService.updateStatsAtDate(docId, {
      lastCharCount: 16000, // word count not tracked on local
      updatedAt: localTsAtDate - 100
    });
    statsService.updateStatsAtDate(docId, {
      lastCharCount: 9000,
      updatedAt: localTsAtDate
    });

    // pull
    vi.advanceTimersByTime(fakeTimersDelay);
    const resp = await statsSynchronizer.pull();
    expect(resp.didPull).toBe(true);
    expect(resp.success).toBe(true);

    const contentStats = statsService.getDataPoints(docId);
    expect(contentStats).toHaveLength(1);
    expect(contentStats[0].date).toBe('2024-03-31');
    expect(contentStats[0].values).toEqual({
      maxWordCount: 1500,
      maxCharCount: 16000,
      lastWordCount: 498,
      lastCharCount: 9000,
      updatedAt: remoteTsAtDate
    });
    const globalStats = statsService.getGlobalStats(docId);
    expect(globalStats.lastOpenedAt).toBe(0);
  });
});
