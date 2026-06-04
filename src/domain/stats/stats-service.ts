import { isDocument } from '@/collection/collection';
import { dateToStr } from '@/common/date-utils';
import { countWords, n00 } from '@/common/utils';
import { ROOT_COLLECTION } from '@/constants';
import { space, spaceQueries } from '@/core/db/store';
import { MetaField } from '@/core/db/types';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { ResultRow } from 'tinybase/with-schemas';
import {
  DataPoint,
  DocumentContentStatsBag,
  DocumentDatedStat,
  DocumentGlobalStatsBag,
  DocumentStatRow
} from './model';

type StatsQueryResult = ResultRow &
  Required<Pick<DocumentStatRow, 'itemId' | 'date' | 'contentStatsJson'>>;

type GlobalStatsQueryResult = ResultRow &
  Required<Pick<DocumentStatRow, 'itemId' | 'lastOpenedAt'>>;

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

class StatsService {
  private timeZone = 'Europe/Paris';

  private buildStatsQuery(itemId: string | null, since: string = '') {
    const queryName = 'GetStatsForItem';
    if (spaceQueries.hasQuery(queryName)) {
      spaceQueries.setParamValues(queryName, { itemId, since });
    } else {
      spaceQueries.setQueryDefinition(
        queryName,
        'stats',
        ({ select, where, param }) => {
          select('itemId');
          select('date');
          select('contentStatsJson');
          if (param('itemId') !== null) {
            where('itemId', param('itemId')!.toString());
          }
          where(getCell => {
            if (!getCell('date')) return false;
            if (!param('since') || param('since')!.toString().length === 0)
              return true;
            const since = param('since')!.toString();
            const date = getCell('date')!.toString();
            return date >= since;
          });
        },
        { itemId, since }
      );
    }
    return queryName;
  }

  private buildGlobalStatsQuery() {
    const queryName = 'GetGlobalStats';
    if (!spaceQueries.hasQuery(queryName)) {
      spaceQueries.setQueryDefinition(
        queryName,
        'stats',
        ({ select, where }) => {
          select('itemId');
          select('lastOpenedAt');
          where(
            getCell => getCell<'lastOpenedAt'>('lastOpenedAt') !== undefined
          );
        }
      );
    }
    return queryName;
  }

  public getStatsSince(since?: string): DocumentDatedStat[] {
    return this.fromQuery<StatsQueryResult, DocumentDatedStat>(
      this.buildStatsQuery(null, since),
      resultRow => ({
        itemId: resultRow.itemId,
        date: resultRow.date,
        contentStats: JSON.parse(
          resultRow.contentStatsJson
        ) as DocumentContentStatsBag
      }),
      'date',
      true
    );
  }

  public getDataPoints(itemId: string): DataPoint[] {
    return this.fromQuery<StatsQueryResult, DataPoint>(
      this.buildStatsQuery(itemId),
      resultRow => ({
        date: resultRow.date,
        values: JSON.parse(
          resultRow.contentStatsJson
        ) as DocumentContentStatsBag
      }),
      'date',
      false
    );
  }

  public getAllGlobalStats(): AllGlobalStatsBag {
    const all: AllGlobalStatsBag = {};
    this.fromQuery<GlobalStatsQueryResult, DocumentGlobalStatsBag>(
      this.buildGlobalStatsQuery(),
      resultRow => {
        all[resultRow.itemId] = { lastOpenedAt: resultRow.lastOpenedAt };
        return all[resultRow.itemId];
      }
    );
    return all;
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
      contentStatsJson: JSON.stringify(mergedStats)
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
      contentStatsJson: JSON.stringify(mergedStats)
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
    const lastCharCount = plain.trim().length;
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
    let rowIds: string[] = [];
    if (scope) {
      rowIds = searchAncestryService.getChildren(scope);
    } else {
      const allNotebooksIds = notebooksService
        .getNotebooks(ROOT_COLLECTION)
        .map(n => n.id);
      allNotebooksIds.forEach(nId => {
        rowIds = [...rowIds, ...searchAncestryService.getChildren(nId)];
      });
    }

    rowIds.forEach(rowId => {
      const rowType = collectionService.getItemType(rowId);
      if (!isDocument({ type: rowType })) return;
      this.backfillDocument(rowId);
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
    const json = space.getCell('stats', rowId, 'contentStatsJson')?.toString();
    if (json) {
      return JSON.parse(json) as DocumentContentStatsBag;
    }
    return {};
  }

  public clearStats() {
    space.delTable('stats');
  }

  private getStatsDate(ts?: number) {
    return dateToStr('date-printable', ts);
  }
}

export const statsService = new StatsService();
