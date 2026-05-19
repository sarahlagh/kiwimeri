import { dateToStr } from '@/common/date-utils';
import { DataPoint } from '@/domain/stats/model';
import assert from 'assert';
import { readFile } from 'fs/promises';

export const readFakeStats = async () => {
  try {
    const fakeStatsStr = await readFile(
      `${__dirname}/_data/stats.json`,
      'utf8'
    );
    const fakeStats = JSON.parse(fakeStatsStr) as DataPoint[];
    return fakeStats;
  } catch (e: any) {
    assert.fail('failed to read test data:' + e.message);
  }
};

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

export function buildRandomFake(n: number, skipDays = false) {
  let wordCount = 0;
  let charCount = 0;
  const rawData: DataPoint[] = [];
  for (let i = n; i >= 0; i--) {
    if (skipDays) {
      const skip = randBool(5);
      if (skip) continue;
    }
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
