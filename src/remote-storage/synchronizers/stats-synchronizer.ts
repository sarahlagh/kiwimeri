import {
  DocumentContentStatsBag,
  DocumentGlobalStatsBag
} from '@/core/services/stats/document-stats';
import { statsService } from '@/core/services/stats/stats-service';
import storageService from '@/db/storage.service';
import { AnyData, RemoteResult } from '@/db/types/store-types';
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

type RemoteRepresentation = Required<Pick<RemoteResult, 'id'>>;

export class StatsSynchronizer extends CloudStorageSynchronizer {
  protected cloudFS: SingleFileStorage; // move to rolling file
  protected ongoing = false;
  protected remoteStateId;

  constructor(
    protected remote: RemoteRepresentation,
    protected driver: CloudStorageDriver
  ) {
    super();
    this.cloudFS = new SingleFileStorage('stats', driver, {
      filename: 'stats.json'
    });
    this.remoteStateId = `${this.remote.id}-stats`;
  }

  public configure(conf: AnyData, proxy?: string, useHttp?: boolean): void {
    this.driver.configure(conf, proxy, useHttp);
  }

  public async connect(): Promise<{
    connected: boolean;
    config?: AnyData | null;
  }> {
    const resp = await this.cloudFS.connect();
    console.debug('[stats][connect]', resp);
    if (resp.remoteState.connected) {
      this.createRemoteStateIfDoesntExist(this.remoteStateId);
      this.updateRemoteStateInfo(this.remoteStateId, resp.remoteState);
    }
    return {
      config: resp.config,
      connected: resp.remoteState.connected || false
    };
  }

  private createRemoteStateIfDoesntExist(id: string) {
    const store = storageService.getStore();
    if (!store.hasRow('remoteState', id)) {
      store.setRow('remoteState', id, {
        connected: false,
        lastRemoteChange: 0
      });
    }
  }

  public async push() // force?: boolean
  : Promise<{ didPush: boolean; success: boolean }> {
    console.log(`[stats][push] starting`, !this.ongoing);
    if (this.ongoing) return { success: false, didPush: false };
    this.ongoing = true;

    // TODO
    // if only get stats of the month, add button in dev tools to force push all
    try {
      // TODO check if there are stats unpushed
      const data = this.computeDataToPush();
      if (data.content.length === 0 && Object.keys(data.global).length === 0) {
        console.log('[stats][push] nothing to push');
        return { success: true, didPush: false };
      }
      const resp = await this.cloudFS.acceptsChanges(data);
      console.debug('stats pushed', resp);

      if (resp.updatedRemoteState) {
        this.updateRemoteStateInfo(this.remoteStateId, resp.updatedRemoteState);
      }
    } catch (e) {
      console.error('[stats][push] error pushing', e);
      return { success: false, didPush: true };
    } finally {
      this.ongoing = false;
    }
    return { success: true, didPush: true };
  }

  public async pull() // force?: boolean
  : Promise<{ didPull: boolean; success: boolean }> {
    console.log(`[stats][pull] starting`, !this.ongoing);
    if (this.ongoing) return { success: false, didPull: false };
    this.ongoing = true;
    try {
      const lastPulled =
        (storageService
          .getStore()
          .getCell(
            'remoteState',
            this.remoteStateId,
            'lastRemoteChange'
          ) as number) || 0;
      const resp = await this.cloudFS.fetchChanges(lastPulled);
      if (resp.success && resp.data && resp.updatedRemoteState) {
        const newStats = resp.data as RemoteStatsFileContent;
        this.mergeRemoteStatsToLocal(newStats);
        this.updateRemoteStateInfo(this.remoteStateId, resp.updatedRemoteState);
      }
      return { success: resp.success, didPull: true };
    } catch (e) {
      console.error('[stats][pull] error pushing', e);
      return { success: false, didPull: true };
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
