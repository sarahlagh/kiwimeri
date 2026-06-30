import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import collectionService from '@/db_to_migrate/collection.service';
import { statsService } from '@/domain/stats/stats-service';
import {
  REMOTE_STATS_SCHEMA_VERSION,
  RemoteStatsFileContent,
  StatsSynchronizer
} from '@/domain/synchronization/merging/synchronizers/stats-synchronizer';
import { InMemDriver } from '@@/_setup/inmem.driver';
import { fakeTimersDelay } from '@@/_setup/test.utils';
import { describe, expect, test, vi } from 'vitest';
import { buildRandomFake } from './test-stats.utils';

const driver = new InMemDriver();
const statsSynchronizer = new StatsSynchronizer({ id: '9999' }, driver);

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
  return docId;
}

describe('stats synchronizer', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    statsSynchronizer.destroy();
    statsSynchronizer.configure({ names: ['stats.json'] });
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

  test('should push no stats if everything already pushed', async () => {
    // init local stats
    initLocalDocAndStats(5);
    const resp1 = await statsSynchronizer.sync();
    expect(resp1.didPush).toBe(true);
    expect(resp1.success).toBe(true);

    vi.advanceTimersByTime(1000);

    const resp2 = await statsSynchronizer.push();
    expect(resp2.didPush).toBe(false);
    expect(resp2.success).toBe(true);
  });

  test('should push local stats', async () => {
    // init local stats
    vi.setSystemTime('2026-04-20');
    const docId1 = initLocalDocAndStats(5);
    vi.setSystemTime('2026-04-26');
    const docId2 = initLocalDocAndStats(10);

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
  });

  test('should pull remote stats', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const remoteContent: RemoteStatsFileContent = {
      _schemaVersion: REMOTE_STATS_SCHEMA_VERSION,
      content: [{ date: '2024-03-31', stats: {} }]
    };
    const tsAtDate = new Date('2024-03-31').getTime();
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
    expect(contentStats).toHaveLength(1);
    expect(contentStats[0].date).toBe('2024-03-31');
    expect(contentStats[0].values).toEqual({
      maxWordCount: 1500,
      maxCharCount: 0,
      lastWordCount: 498,
      lastCharCount: 0,
      updatedAt: tsAtDate
    });
  });

  test('should pull remote stats and merge with content stats if remote more recent', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const remoteContent: RemoteStatsFileContent = {
      _schemaVersion: REMOTE_STATS_SCHEMA_VERSION,
      content: [{ date: '2024-03-31', stats: {} }]
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
  });

  test('should pull remote stats and merge with content stats if remote less recent', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const remoteContent: RemoteStatsFileContent = {
      _schemaVersion: REMOTE_STATS_SCHEMA_VERSION,
      content: [{ date: '2024-03-31', stats: {} }]
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
  });

  test('should pull remote stats and merge even when most recent has stat undefined', async () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const remoteContent: RemoteStatsFileContent = {
      _schemaVersion: REMOTE_STATS_SCHEMA_VERSION,
      content: [{ date: '2024-03-31', stats: {} }]
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
  });
});
