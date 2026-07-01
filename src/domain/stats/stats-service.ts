import { ROOT_COLLECTION } from '@/constants';
import { space, spaceQueries } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { MetaField } from '@/core/db/types';
import { isDocument } from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import { historyService } from '@/domain/history/history.service';
import { dateToStr } from '@/shared/misc/date-utils';
import { countWords, n00 } from '@/shared/utils';
import {
  DataPoint,
  DocumentContentStatsBag,
  DocumentDatedStat,
  DocumentGlobalStatsBag
} from './stats';

export type AllGlobalStatsBag = {
  [key: string]: DocumentGlobalStatsBag; // key is the itemId
};

export const trackedStats = [
  'lastWordCount',
  'maxWordCount',
  'lastCharCount',
  'maxCharCount'
] as const;
export type TrackedStats = (typeof trackedStats)[number];

export type SampleMode = 'day' | 'month' | 'year' | 'lifetime';

const S = SpaceTables.Stats;

class StatsService {
  private timeZone = 'Europe/Paris';

  private fetchStatsSince(
    desc: boolean,
    itemId: string | null,
    since?: string
  ) {
    const results: DocumentDatedStat[] = [];
    const table = space.getTable(S);
    space.getSortedRowIds(S, 'date', desc).forEach(rowId => {
      const date = table[rowId].date;
      if (!date) return;
      if (since !== undefined && date < since) return;
      if (itemId !== null && itemId !== table[rowId].itemId) return;
      results.push({
        date,
        itemId: table[rowId].itemId || '',
        contentStatsJson: table[rowId].contentStatsJson || {}
      });
    });
    return results;
  }

  public getStatsSince(since?: string): DocumentDatedStat[] {
    return this.fetchStatsSince(true, null, since);
  }

  public getDataPoints(itemId: string): DataPoint[] {
    return this.fetchStatsSince(false, itemId).map(result => ({
      date: result.date,
      values: result.contentStatsJson
    }));
  }

  public getAllGlobalStats(): AllGlobalStatsBag {
    const result: AllGlobalStatsBag = {};
    const table = space.getTable(S);
    space.getSortedRowIds(S).forEach(rowId => {
      const lastOpenedAt = table[rowId].lastOpenedAt;
      if (lastOpenedAt === undefined) return;
      const itemId = table[rowId].itemId!;
      result[itemId] = { lastOpenedAt };
    });
    return result;
  }

  private fromQuery<T, U>(
    queryName: string,
    rowMapper: (row: T, rowId: string) => U,
    sortBy?: string | undefined,
    descending?: boolean | undefined,
    offset?: number | undefined,
    limit?: number | undefined
  ) {
    return spaceQueries
      .getResultSortedRowIds(queryName, sortBy, descending, offset, limit)
      .map(rowId => {
        const resultRow = spaceQueries.getResultRow(queryName, rowId) as T;
        return rowMapper(resultRow, rowId);
      });
  }

  public updateStatsAtDate(
    itemId: string,
    statsBag: Pick<
      DocumentContentStatsBag,
      'lastWordCount' | 'lastCharCount' | 'updatedAt'
    >
  ) {
    const date = this.getStatsDate(statsBag.updatedAt);
    const rowId = `${itemId}-${date}`;

    const mergedStats = { ...this.getContentStats(rowId), ...statsBag };
    if (n00(mergedStats.maxCharCount) < n00(statsBag.lastCharCount)) {
      mergedStats.maxCharCount = statsBag.lastCharCount;
    }
    if (n00(mergedStats.maxWordCount) < n00(statsBag.lastWordCount)) {
      mergedStats.maxWordCount = statsBag.lastWordCount;
    }

    space.setPartialRow('stats', rowId, {
      itemId,
      date,
      contentStatsJson: mergedStats
    });
  }

  private mergeLastStat(
    stat: keyof DocumentContentStatsBag,
    mostRecent: DocumentContentStatsBag,
    statsBag1: DocumentContentStatsBag,
    statsBag2: DocumentContentStatsBag
  ) {
    if (mostRecent[stat] === undefined)
      mostRecent[stat] = Math.max(n00(statsBag1[stat]), n00(statsBag2[stat]));
  }

  public mergeStatsAtDate(itemId: string, statsBag: DocumentContentStatsBag) {
    const date = this.getStatsDate(statsBag.updatedAt);
    const rowId = `${itemId}-${date}`;

    const existingStats = this.getContentStats(rowId);
    const mostRecent =
      n00(existingStats.updatedAt) > n00(statsBag.updatedAt)
        ? existingStats
        : statsBag;

    this.mergeLastStat('lastCharCount', mostRecent, existingStats, statsBag);
    this.mergeLastStat('lastWordCount', mostRecent, existingStats, statsBag);

    const mergedStats: DocumentContentStatsBag = {
      maxCharCount: Math.max(
        n00(existingStats.maxCharCount),
        n00(statsBag.maxCharCount)
      ),
      maxWordCount: Math.max(
        n00(existingStats.maxWordCount),
        n00(statsBag.maxWordCount)
      ),
      updatedAt: mostRecent.updatedAt,
      lastCharCount: mostRecent.lastCharCount,
      lastWordCount: mostRecent.lastWordCount
    };

    space.setPartialRow('stats', rowId, {
      itemId,
      date,
      contentStatsJson: mergedStats
    });
  }

  public buildStatsFromContentMeta(
    plain: string,
    content_meta: MetaField
  ): Pick<
    DocumentContentStatsBag,
    'lastWordCount' | 'lastCharCount' | 'updatedAt'
  > {
    const lastWordCount = countWords(plain);
    const lastCharCount = plain?.trim().length;
    const updatedAt = content_meta._u;
    return { lastCharCount, lastWordCount, updatedAt };
  }

  public updateGlobalStats(itemId: string, globalBag: DocumentGlobalStatsBag) {
    const rowId = itemId;
    space.setPartialRow('stats', rowId, {
      itemId,
      ...globalBag
    });
  }

  public getGlobalStats(itemId: string) {
    const globalStats: DocumentGlobalStatsBag = { lastOpenedAt: 0 };
    const lastOpened = space
      .getCell('stats', itemId, 'lastOpenedAt')
      ?.valueOf();
    if (lastOpened !== undefined) {
      globalStats.lastOpenedAt = lastOpened as number;
    }
    return globalStats;
  }

  public backfillStats(scope?: string) {
    const rows = collectionService.getAllChildren(scope || ROOT_COLLECTION);

    rows.forEach(row => {
      if (!isDocument({ type: row.type })) return;
      this.backfillDocument(row.id);
    });
  }

  private backfillDocument(rowId: string) {
    const globalBag = this.getGlobalStats(rowId);
    let lastOpenedAt = globalBag.lastOpenedAt;

    // backfill stats from versions in reverse order
    const versions = historyService
      .getVersions(rowId)
      .filter(v => v.op === 'snapshot');

    for (let i = versions.length - 1; i >= 0; i--) {
      const version = versions[i];
      const plain = version.preview;
      const content_meta = version.snapshotJson.content_meta!;
      const stats = this.buildStatsFromContentMeta(plain, content_meta);
      this.updateStatsAtDate(rowId, stats);
      if (lastOpenedAt <= stats.updatedAt!) {
        this.updateGlobalStats(rowId, {
          lastOpenedAt: stats.updatedAt!
        });
        lastOpenedAt = stats.updatedAt!;
      }
    }
  }

  private getContentStats(rowId: string): DocumentContentStatsBag {
    return space.getCell('stats', rowId, 'contentStatsJson') || {};
  }

  public clearStats() {
    space.delTable('stats');
  }

  private getStatsDate(ts?: number) {
    return dateToStr('date-printable', ts);
  }
}

export const statsService = new StatsService();
