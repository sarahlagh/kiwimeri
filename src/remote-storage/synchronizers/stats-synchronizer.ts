import {
  DocumentContentStatsBag,
  DocumentGlobalStatsBag
} from '@/core/services/stats/document-stats';
import { statsService } from '@/core/services/stats/stats-service';
import { AnyData } from '@/db/types/store-types';
import { CloudStorageDriver } from '../storage-drivers/abstract.driver';
import { SingleFileStorage } from '../storage-filesystems/singlefile.filesystem';
import { CloudStorageSynchronizer } from './abstract-synchronizer';

type RemoteContentStatPerDate = {
  date: string;
  stats: {
    [key: string]: DocumentContentStatsBag; // key is the itemId
  };
};

export type RemoteStatsFileContent = {
  content: RemoteContentStatPerDate[];
  global: {
    [key: string]: DocumentGlobalStatsBag; // key is the itemId
  };
};

export class StatsSynchronizer extends CloudStorageSynchronizer {
  protected cloudFS: SingleFileStorage; // move to rolling file
  protected ongoing = false;

  constructor(protected driver: CloudStorageDriver) {
    super();
    this.cloudFS = new SingleFileStorage(driver, {
      filename: 'stats.json'
    });
  }

  public configure(conf?: AnyData, proxy?: string, useHttp?: boolean): void {
    throw new Error('Method not implemented.');
  }

  public async connect(): Promise<{
    connected: boolean;
    config?: AnyData | null;
  }> {
    const resp = await this.cloudFS.connect();
    console.debug('[stats][connect]', resp);
    // TODO update remote state
    // if (resp.remoteState.connected) {
    //   this.updateRemoteStateInfo(this.remote.state, resp.remoteState);
    // }
    return {
      config: resp.config,
      connected: resp.remoteState.connected || false
    };
  }
  public async push() // force?: boolean
  : Promise<{ didPush?: boolean; success: boolean }> {
    console.log(`[stats][push] starting`, !this.ongoing);
    if (this.ongoing) return { success: false };
    this.ongoing = true;

    // TODO
    // if only get stats of the month, add button in dev tools to force push all
    try {
      const data = this.computeDataToPush();
      if (data.content.length === 0 && Object.keys(data.global).length === 0) {
        console.log('[stats][push] nothing to push');
        return { success: true, didPush: false };
      }
      const resp = await this.cloudFS.acceptsChanges(data);
      console.debug('stats pushed', resp);
    } catch (e) {
      console.error('[stats][push] error pushing', e);
      return { success: false };
    } finally {
      this.ongoing = false;
    }
    return { success: true, didPush: true };
  }
  public async pull() // force?: boolean
  : Promise<{ didPull?: boolean; success: boolean }> {
    console.log(`[stats][pull] starting`, !this.ongoing);
    if (this.ongoing) return { success: false };
    this.ongoing = true;
    try {
      const resp = await this.cloudFS.fetchChanges(0);
      if (resp.success && resp.data) {
        const newStats = resp.data as RemoteStatsFileContent;
        this.mergeRemoteStatsToLocal(newStats);
      }
      return { success: resp.success, didPull: true };
    } catch (e) {
      console.error('[stats][pull] error pushing', e);
      return { success: false };
    } finally {
      this.ongoing = false;
    }
  }

  public async destroy() {
    return this.driver.close();
  }

  private computeDataToPush(): RemoteStatsFileContent {
    const stats = statsService.getStatsSince();
    const global = statsService.getAllGlobalStats();
    const perDate: {
      [key: string]: RemoteContentStatPerDate; // key is date
    } = {};

    stats.forEach(stat => {
      if (!perDate[stat.date]) {
        perDate[stat.date] = {
          date: stat.date,
          stats: {}
        };
      }
      const perItem = perDate[stat.date]!.stats;
      perItem[stat.itemId] = stat.contentStats;
    });

    const fileData: RemoteStatsFileContent = {
      content: Object.values(perDate),
      global
    };
    return fileData;
  }

  private mergeRemoteStatsToLocal(remoteStats: RemoteStatsFileContent) {
    // content stats
    remoteStats.content.forEach(statsAtDate => {
      const itemIds = Object.keys(statsAtDate.stats);
      itemIds.forEach(itemId => {
        statsService.mergeStatsAtDate(itemId, statsAtDate.stats[itemId]);
      });
    });
    // global stats
    const itemIds = Object.keys(remoteStats.global);
    itemIds.forEach(itemId => {
      statsService.mergeGlobalStats(itemId, remoteStats.global[itemId]);
    });
  }
}
