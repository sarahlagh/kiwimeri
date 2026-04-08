import { parseFieldMeta } from '@/collection/collection';
import { dateToStr } from '@/common/date-utils';
import { countWords, n00 } from '@/common/utils';
import storageService from '@/db/storage.service';
import {
  DocumentContentStatsBag,
  DocumentGlobalStatsBag
} from './document-stats';

class StatsService {
  private timeZone = 'Europe/Paris';

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

    console.debug('set today stats', rowId, mergedStats);
    space.setPartialRow('stats', rowId, {
      itemId,
      date,
      contentStatsJson: JSON.stringify(mergedStats)
    });
  }

  public getStats(
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
    console.debug('set global stats', itemId, globalBag);
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
