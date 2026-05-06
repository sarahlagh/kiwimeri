import { DEFAULT_NOTEBOOK_ID, DEFAULT_SPACE_ID } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import storageService from '@/db/storage.service';
import userSettingsService from '@/db/user-settings.service';
import { DocumentContentStatsBag } from '@/domain/stats/document-stats';
import { statsService } from '@/domain/stats/stats-service';
import { DataPoint } from '@/features/stats-ui/models/data-point';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { fakeTimersDelay, getNewContent } from '@/vitest/setup/test.utils';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import { readFakeStats } from './test-stats.utils';

let fakeStats: DataPoint[] = [];
let docId = '';
describe('stats service', () => {
  beforeAll(async () => {
    fakeStats = await readFakeStats();
  });
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime('2026-04-15'); // TODO why needed? because of a starting stat at time of doc creation?
    docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    fakeStats.forEach(dataPoint => {
      statsService.updateStatsAtDate(docId, {
        lastCharCount: dataPoint.values.lastCharCount,
        lastWordCount: dataPoint.values.lastWordCount,
        updatedAt: dataPoint.values.updatedAt
      });
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // TODO test stat generation on update
  // TODO test stat migration on bootstrap

  it(`should query stats`, async () => {
    const stats = statsService.getDataPoints(docId);
    expect(stats.length).toBe(618);
    expect(
      stats.some(stat => stat.values.maxWordCount > stat.values.lastWordCount)
    ).toBe(true);
    expect(
      stats.some(stat => stat.values.maxWordCount === stat.values.lastWordCount)
    ).toBe(true);
    expect(
      stats.some(stat => stat.values.maxWordCount < stat.values.lastWordCount)
    ).toBe(false);
    expect(stats.some(stat => stat.values.maxWordCount === undefined)).toBe(
      false
    );
    expect(stats.find(s => s.date === '2024-03-29')?.values.maxWordCount).toBe(
      404
    );
    expect(new Date(stats[0].date).getTime()).toBeLessThan(
      new Date(stats[1].date).getTime()
    );
  });

  it.skip(`should sample stats per last n days test`, async () => {
    const nDays = 30;

    const queries = storageService.getSpaceQueries(DEFAULT_SPACE_ID);
    const queryName = 'GetStatsForItemSince';
    queries.setQueryDefinition(
      queryName,
      'stats',
      ({ select, where, param }) => {
        let firstDate = '';
        select('itemId');
        select('date');
        select('contentStatsJson');
        where('itemId', param('itemId')!.toString());
        where(getCell => {
          if (!getCell('date')) return false;
          if (param('nDays') === undefined) return true;
          if (firstDate.length === 0) {
            // TODO how do i know it's really the latest date?
            // TODO test with data inserted for other items
            firstDate = getCell('date')!.toString();
          }
          const nDays = param('nDays')?.valueOf() as number;
          const date = getCell('date') as string;

          const firstDateObj = new Date(firstDate);
          const dateObj = new Date(date);
          const virtualField =
            (dateObj.getTime() - firstDateObj.getTime()) / (3600000 * 24);
          return -virtualField <= nDays;
        });
      },
      { itemId: docId, nDays }
    );

    const results = queries
      .getResultSortedRowIds(queryName, 'date', true)
      .map(rowId => {
        const resultRow = queries.getResultRow(queryName, rowId) as {
          itemId: string;
          date: string;
          contentStatsJson: string;
        };
        return {
          date: resultRow.date,
          values: JSON.parse(
            resultRow.contentStatsJson
          ) as DocumentContentStatsBag
        };
      });

    // what if i only have a couple of stats in the month?
    // what kind of view do i want, really? last 30 days since time of viewing, or last 30 days since last update?
    // in both cases, i need to limit by date, not number of rows
    // what if... [2026-03-01, 2026-03-26, 2026-04-12], and since=2026-03-16 i'll have only two points, [2026-03-26, 2026-04-12]...
    // but in practice i'd probably want to display 2026-03-01, too. so if first point !== since take the one before that
    // do a separate test for that
    console.log(results);
    expect(results).toHaveLength(26);
    expect(results[0].date).toBe('2026-04-15');
    expect(results[25].date).toBe('2026-03-16');
  });

  describe(`stats generation`, () => {
    beforeEach(() => {
      searchAncestryService.start();
      userSettingsService.setSpaceDefaultDisplayOpts({
        sort: { by: 'created', descending: false },
        statsEnabled: true
      });
    });
    afterEach(() => {
      searchAncestryService.stop();
    });

    it(`should generate stats per item per day`, () => {
      const docId1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const docId2 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);

      vi.advanceTimersByTime(60000);
      collectionService.setItemLexicalContent(
        docId1,
        JSON.parse(getNewContent('one'))
      );
      collectionService.setItemLexicalContent(
        docId2,
        JSON.parse(getNewContent('lots and lots of '))
      );
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemLexicalContent(
        docId1,
        JSON.parse(getNewContent('one two'))
      );
      collectionService.setItemLexicalContent(
        docId2,
        JSON.parse(getNewContent('lots and lots of words'))
      );

      {
        const points = statsService.getDataPoints(docId1);
        expect(points).toHaveLength(1);
        expect(points[0].values['lastWordCount']).toBe(2);
      }

      {
        const points = statsService.getDataPoints(docId2);
        expect(points).toHaveLength(1);
        expect(points[0].values['lastWordCount']).toBe(5);
      }

      // advance by one day
      vi.advanceTimersByTime(3600000 * 26);

      collectionService.setItemLexicalContent(
        docId1,
        JSON.parse(getNewContent('one two three'))
      );
      collectionService.setItemLexicalContent(
        docId2,
        JSON.parse(getNewContent('lots'))
      );
      vi.advanceTimersByTime(fakeTimersDelay);

      {
        const points = statsService.getDataPoints(docId1);
        expect(points).toHaveLength(2);
        expect(points[0].values['lastWordCount']).toBe(2);
        expect(points[1].values['lastWordCount']).toBe(3);
      }

      {
        const points = statsService.getDataPoints(docId2);
        expect(points).toHaveLength(2);
        expect(points[0].values['lastWordCount']).toBe(5);
        expect(points[1].values['lastWordCount']).toBe(1);
      }
    });
  });

  describe(`backfilling`, () => {
    beforeEach(() => {
      historyService['enabled'] = true;
      userSettingsService.setHistoryIdleTime(50);
      searchAncestryService.start();
    });
    afterEach(() => {
      historyService['enabled'] = false;
      searchAncestryService.stop();
    });

    it(`should backfill stats on notebook enabled`, () => {
      const n1 = notebooksService.addNotebook('n1');
      const docId0 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const docId1 = collectionService.addDocument(n1);
      collectionService.setItemLexicalContent(
        docId0,
        JSON.parse(getNewContent('three little words'))
      );
      collectionService.setItemLexicalContent(
        docId1,
        JSON.parse(getNewContent('two words'))
      );
      vi.advanceTimersByTime(fakeTimersDelay);

      statsService.backfillStats(n1);

      expect(statsService.getDataPoints(docId0)).toHaveLength(0);
      const dataPoints1 = statsService.getDataPoints(docId1);
      expect(dataPoints1).toHaveLength(1);
      expect(dataPoints1[0].values.lastWordCount).toBe(2);

      expect(statsService.getGlobalStats(docId0).lastOpenedAt).toBe(0);
      expect(statsService.getGlobalStats(docId1).lastOpenedAt).toBeGreaterThan(
        0
      );
    });

    it(`should backfill stats on space enabled`, () => {
      const n1 = notebooksService.addNotebook('n1');
      const docId0 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const docId1 = collectionService.addDocument(n1);
      collectionService.setItemLexicalContent(
        docId0,
        JSON.parse(getNewContent('three little words'))
      );
      collectionService.setItemLexicalContent(
        docId1,
        JSON.parse(getNewContent('two words'))
      );
      vi.advanceTimersByTime(fakeTimersDelay);

      statsService.backfillStats();

      const dataPoints0 = statsService.getDataPoints(docId0);
      expect(dataPoints0).toHaveLength(1);
      expect(dataPoints0[0].values.lastWordCount).toBe(3);
      const dataPoints1 = statsService.getDataPoints(docId1);
      expect(dataPoints1).toHaveLength(1);
      expect(dataPoints1[0].values.lastWordCount).toBe(2);

      expect(statsService.getGlobalStats(docId0).lastOpenedAt).toBeGreaterThan(
        0
      );
      expect(statsService.getGlobalStats(docId1).lastOpenedAt).toBeGreaterThan(
        0
      );
    });

    it(`should not override existing lastOpened on backfill`, () => {
      const n1 = notebooksService.addNotebook('n1');
      const docId0 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const docId1 = collectionService.addDocument(n1);
      collectionService.setItemLexicalContent(
        docId0,
        JSON.parse(getNewContent('three little words'))
      );
      collectionService.setItemLexicalContent(
        docId1,
        JSON.parse(getNewContent('two words'))
      );
      vi.advanceTimersByTime(fakeTimersDelay);

      const future = Date.now() + 500;
      statsService.updateGlobalStats(docId1, {
        lastOpenedAt: future
      });

      statsService.backfillStats(n1);

      expect(statsService.getDataPoints(docId0)).toHaveLength(0);
      const dataPoints1 = statsService.getDataPoints(docId1);
      expect(dataPoints1).toHaveLength(1);
      expect(dataPoints1[0].values.lastWordCount).toBe(2);

      expect(statsService.getGlobalStats(docId0).lastOpenedAt).toBe(0);
      expect(statsService.getGlobalStats(docId1).lastOpenedAt).toBe(future);
    });

    it(`should backfill page stats`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const pageId = collectionService.addPage(docId);
      collectionService.setItemLexicalContent(
        pageId,
        JSON.parse(getNewContent('two words'))
      );
      vi.advanceTimersByTime(3600000 * 26);
      collectionService.setItemLexicalContent(
        pageId,
        JSON.parse(getNewContent('three little words'))
      );
      vi.advanceTimersByTime(3600000 * 26);
      expect(historyService.getVersions(docId)).toHaveLength(4);

      statsService.backfillStats(DEFAULT_NOTEBOOK_ID);

      const pageStats = statsService.getDataPoints(pageId);
      expect(pageStats).toHaveLength(2);
      expect(pageStats[0].values.lastWordCount).toBe(2);
      expect(pageStats[1].values.lastWordCount).toBe(3);
    });
  });
});
