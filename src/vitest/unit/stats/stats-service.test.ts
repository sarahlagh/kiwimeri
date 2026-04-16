import { dateToStr } from '@/common/date-utils';
import { DEFAULT_NOTEBOOK_ID, DEFAULT_SPACE_ID } from '@/constants';
import collectionService from '@/db/collection.service';
import storageService from '@/db/storage.service';
import { DataPoint } from '@/stats/components/data-point';
import { DocumentContentStatsBag } from '@/stats/document-stats';
import { statsService } from '@/stats/stats-service';
import { readFile } from 'fs/promises';
import {
  afterEach,
  assert,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

function randInt(max = 1000) {
  return Math.round(Math.random() * max);
}

function randBool(chance = 5) {
  return randInt() % chance === 0;
}

function randSignedInt(max = 1000) {
  const abs = randInt(max);
  const sign = randBool(3) ? -1 : 1;
  return sign * abs;
}

function buildRandomFake(n = 750) {
  let wordCount = 0;
  let charCount = 0;
  const rawData: DataPoint[] = [];
  for (let i = n; i >= 0; i--) {
    const skip = randBool(5);
    if (skip) continue;
    const timesInDay = randInt(5) + 1;
    const day = Date.now() - i * 60000 * 60 * 24;
    for (let j = 0; j < timesInDay; j++) {
      const date = dateToStr('date-printable', day);
      wordCount += randSignedInt(100);
      if (wordCount < 0) wordCount = randInt(10);
      charCount += randSignedInt(1000);
      if (charCount < 0) charCount = randInt(100);
      rawData.push({
        date,
        values: {
          lastWordCount: wordCount,
          lastCharCount: charCount,
          updatedAt: day + j * 60000 * 60
        }
      });
    }
  }
  return rawData;
}

let fakeStatsStr = '';
let fakeStats: DataPoint[] = [];
let docId = '';
describe('stats service', () => {
  beforeAll(async () => {
    try {
      fakeStatsStr = await readFile(`${__dirname}/_data/stats.json`, 'utf8');
      fakeStats = JSON.parse(fakeStatsStr) as DataPoint[];
    } catch (e: any) {
      assert.fail('failed to read test data:' + e.message);
    }
  });
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime('2026-04-15'); // TODO why needed? because of a starting stat at time of doc creation?
    docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    fakeStats.forEach(dataPoint => {
      statsService.updateTodaysStats(docId, {
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
    // const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    // const fakeStats = JSON.parse(fakeStatsStr) as DataPoint[];
    // const fakeStats = buildRandomFake(750);
    // await writeFile(`${__dirname}/_data/stats.json`, JSON.stringify(fakeStats));
    // fakeStats.forEach(dataPoint => {
    //   statsService.updateTodaysStats(id, {
    //     lastCharCount: dataPoint.values.lastCharCount,
    //     lastWordCount: dataPoint.values.lastWordCount,
    //     updatedAt: dataPoint.values.updatedAt
    //   });
    // });

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
});
