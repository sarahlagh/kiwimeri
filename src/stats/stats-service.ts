import { parseFieldMeta } from '@/collection/collection';
import { dateToStr } from '@/common/date-utils';
import { countWords, n00 } from '@/common/utils';
import { DEFAULT_SPACE_ID } from '@/constants';
import storageService from '@/db/storage.service';
import { ResultRow } from 'tinybase/with-schemas';
import { DataPoint } from './components/data-point';
import {
  DocumentContentStatsBag,
  DocumentDatedStat,
  DocumentGlobalStatsBag,
  DocumentStatRow
} from './document-stats';

type StatsQueryResult = ResultRow &
  Required<Pick<DocumentStatRow, 'itemId' | 'date' | 'contentStatsJson'>>;

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

  private buildStatsQuery(itemId: string, since: string = '') {
    const queries = storageService.getSpaceQueries(DEFAULT_SPACE_ID);
    const queryName = 'GetStatsForItem';
    if (queries.hasQuery(queryName)) {
      queries.setParamValues(queryName, { itemId, since });
    } else {
      queries.setQueryDefinition(
        queryName,
        'stats',
        ({ select, where, param }) => {
          select('itemId');
          select('date');
          select('contentStatsJson');
          where('itemId', param('itemId')!.toString());
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

  public getStatsForItem(itemId: string): DocumentDatedStat[] {
    return this.fromQuery<StatsQueryResult, DocumentDatedStat>(
      this.buildStatsQuery(itemId),
      (resultRow, rowId) => ({
        id: rowId,
        itemId: resultRow.itemId,
        date: resultRow.date,
        contentStats: JSON.parse(
          resultRow.contentStatsJson
        ) as DocumentContentStatsBag
      })
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

  private fromQuery<T, U>(
    queryName: string,
    rowMapper: (row: T, rowId: string) => U,
    sortBy?: string | undefined,
    descending?: boolean | undefined,
    offset?: number | undefined,
    limit?: number | undefined
  ) {
    const queries = storageService.getSpaceQueries();
    return queries
      .getResultSortedRowIds(queryName, sortBy, descending, offset, limit)
      .map(rowId => {
        const resultRow = queries.getResultRow(queryName, rowId) as T;
        return rowMapper(resultRow, rowId);
      });
  }

  public updateTodaysStats(
    itemId: string,
    statsBag: Pick<
      DocumentContentStatsBag,
      'lastWordCount' | 'lastCharCount' | 'updatedAt'
    >
  ) {
    const space = storageService.getSpace();
    const date = this.getToday(statsBag.updatedAt);
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

  public buildStats(
    plain: string,
    content_meta: string
  ): Pick<
    DocumentContentStatsBag,
    'lastWordCount' | 'lastCharCount' | 'updatedAt'
  > {
    const lastWordCount = countWords(plain);
    const lastCharCount = plain.trim().length;
    const updatedAt = parseFieldMeta(content_meta).u;
    return { lastCharCount, lastWordCount, updatedAt };
  }

  public updateGlobalStats(itemId: string, globalBag: DocumentGlobalStatsBag) {
    const rowId = itemId;
    storageService.getSpace().setPartialRow('stats', rowId, {
      itemId,
      ...globalBag
    });
  }

  private getContentStats(rowId: string): DocumentContentStatsBag {
    const json = storageService
      .getSpace()
      .getCell('stats', rowId, 'contentStatsJson')
      ?.toString();
    if (json) {
      return JSON.parse(json) as DocumentContentStatsBag;
    }
    return {};
  }

  private getToday(ts?: number) {
    return dateToStr('date-printable', ts);
  }
}

export const statsService = new StatsService();
