import { networkService } from '@/common/services/network.service';
import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import { INTERNAL_FORMAT } from '@/constants';
import { CloudStorageSynchronizer } from '@/remote-storage/synchronizers/abstract-synchronizer';
import { CompositeSynchronizer } from '@/remote-storage/synchronizers/composite-synchronizer';
import { ConnectionStatusChangeListener } from '@capacitor/network';
import storageService from './storage.service';
import {
  useCellWithRef,
  useResultSortedRowIdsWithRef,
  useResultTableWithRef
} from './tinybase/hooks';
import { AnyData, RemoteResult } from './types/store-types';

class RemotesService {
  private readonly storeId = 'store';
  private readonly remotesTable = 'remotes';
  private readonly stateTable = 'remoteState';

  private synchronizers: Map<string, CloudStorageSynchronizer> = new Map();

  private networkListener: ConnectionStatusChangeListener | null = null;

  private fetchAllRemotesQuery(space: string) {
    const queries = storageService.getStoreQueries();
    const queryName = `fetchAllRemotesFor${space}`;
    if (!queries.hasQuery(queryName)) {
      queries.setQueryDefinition(
        queryName,
        'remotes',
        ({ select, join, where }) => {
          select('rank');
          select('name');
          select('type');
          select('config');
          select('formats');
          select('state');
          select(this.stateTable, 'connected');
          join(this.stateTable, 'state');
          where('space', space);
        }
      );
    }
    return queryName;
  }

  public async initSync() {
    if (platformService.isSyncEnabled()) {
      if (!this.networkListener) {
        this.networkListener = networkService.onStatusUp(
          () => {
            setTimeout(async () => {
              console.log(
                '[storage] network connected - will attempt to re init remotes'
              );
              await this.onReinit();
            });
          },
          true,
          '[storage reinit]'
        );
      }
    }
  }

  public async onReinit() {
    await this.configureRemotes(storageService.getSpaceId());
  }

  public stopSync() {
    this.synchronizers.forEach(fs => {
      fs.destroy();
    });
    this.synchronizers.clear();
    if (this.networkListener) {
      networkService.removeListener(this.networkListener);
      this.networkListener = null;
    }
  }

  public async configureRemotes(space: string, initAll = false) {
    const remotes = this.getRemotes();
    const connectedRemotes = remotes.filter(
      remote => initAll || remote.connected
    );

    if (connectedRemotes.length < 1) {
      console.log('[storage] no initial sync configuration');
      return;
    }

    for (const remote of connectedRemotes) {
      console.log(
        '[storage] found initial sync configurations',
        space,
        remote.name,
        remote.type
      );
      const connected = await this.configure(remote, JSON.parse(remote.config));
      console.debug(`remote ${remote.name} configured: ${connected}`);
    }
  }

  public async configure(remote: RemoteResult, config: AnyData) {
    let proxy = undefined;
    let useHttp = false;
    if (platformService.isWeb()) {
      proxy = platformService.getInternalProxy();
      useHttp = appConfig.DEV_USE_HTTP_IF_POSSIBLE;
    }
    if (!this.synchronizers.has(remote.id))
      this.synchronizers.set(remote.id, new CompositeSynchronizer(remote));
    const synchronizer = this.synchronizers.get(remote.id)!;
    synchronizer.configure(config, proxy, useHttp);

    const networkStatus = networkService.getStatus();
    if (networkStatus && !networkStatus.connected) {
      // if no network, don't bother
      return false;
    }

    const newConf = await synchronizer.connect();
    if (newConf.config) {
      this.setRemoteConfig(remote.id, newConf.config);
    }

    this.setRemoteStateConnected(remote.state, newConf.connected || false);
    return true;
  }

  public getRemotes(space?: string) {
    if (!space) {
      space = storageService.getSpaceId();
    }
    const queryName = this.fetchAllRemotesQuery(space);
    return storageService
      .getStoreQueries()
      .getResultSortedRowIds(queryName, 'rank')
      .map(rowId => {
        const row = storageService
          .getStoreQueries()
          .getResultRow(queryName, rowId);
        return { ...row, id: rowId } as RemoteResult;
      });
  }

  public useRemotes() {
    const queryName = this.fetchAllRemotesQuery(storageService.getSpaceId());

    const table = useResultTableWithRef(this.storeId, queryName);
    return useResultSortedRowIdsWithRef(this.storeId, queryName, 'rank').map(
      rowId => {
        const row = table[rowId];
        return { ...row, id: rowId } as RemoteResult;
      }
    );
  }

  public usePrimaryRemote() {
    const remotes = this.useRemotes();
    return remotes && remotes.length > 0 ? remotes[0] : undefined;
  }

  public usePrimaryLastRemoteChange() {
    const remote = this.usePrimaryRemote();
    return (
      useCellWithRef<number>(
        this.storeId,
        this.stateTable,
        remote?.state || '-1',
        'lastRemoteChange'
      ) || 0
    );
  }

  public getLastRemoteChange(state: string) {
    return (
      (storageService
        .getStore()
        .getCell(this.stateTable, state || '-1', 'lastRemoteChange')
        ?.valueOf() as number) || 0
    );
  }

  public addRemote(
    name: string,
    rank: number,
    type: string,
    defaultConf?: AnyData
  ) {
    const state = storageService.getStore().addRow(this.stateTable, {
      connected: false,
      lastRemoteChange: 0
    });
    storageService.getStore().addRow(
      this.remotesTable,
      {
        rank,
        name,
        state,
        type,
        space: storageService.getSpaceId(),
        config: defaultConf ? JSON.stringify(defaultConf) : '{}',
        formats: INTERNAL_FORMAT
      },
      false
    );
  }

  public async delRemote(remote: string) {
    storageService.getStore().transaction(() => {
      // update ranks
      const remaining = this.getRemotes().filter(r => r.id !== remote);
      for (let i = 0; i < remaining.length; i++) {
        storageService
          .getStore()
          .setCell(this.remotesTable, remaining[i].id, 'rank', i);
      }
      // delete the row
      storageService.getStore().delRow(this.remotesTable, remote);
      storageService.getStore().delRow(this.stateTable, remote);
    });

    if (this.synchronizers.has(remote))
      await this.synchronizers.get(remote)?.destroy();

    this.synchronizers.delete(remote);
  }

  public setRemoteName(remote: string, name: string) {
    storageService.getStore().setCell(this.remotesTable, remote, 'name', name);
  }

  public setRemoteConfig(remote: string, config: AnyData) {
    storageService
      .getStore()
      .setCell(this.remotesTable, remote, 'config', JSON.stringify(config));
  }

  public setRemoteStateConnected(remote: string, connected: boolean) {
    storageService
      .getStore()
      .setCell(this.stateTable, remote, 'connected', connected);
  }

  public updateRemoteRank(currentRank: number, newRank: number) {
    storageService.getStore().transaction(() => {
      const remotes = this.getRemotes();
      if (currentRank < newRank) {
        for (let i = currentRank + 1; i < newRank + 1; i++) {
          storageService
            .getStore()
            .setCell(this.remotesTable, remotes[i].id, 'rank', i - 1);
        }
      } else {
        for (let i = newRank; i < currentRank; i++) {
          storageService
            .getStore()
            .setCell(this.remotesTable, remotes[i].id, 'rank', i + 1);
        }
      }
      storageService
        .getStore()
        .setCell(this.remotesTable, remotes[currentRank].id, 'rank', newRank);
    });
  }

  public async push(remote: RemoteResult, force = false) {
    const synchronizer = this.synchronizers.get(remote.id);
    if (!synchronizer) return { success: false };
    return synchronizer.push(force);
  }

  public async pull(remote: RemoteResult, force = false) {
    const synchronizer = this.synchronizers.get(remote.id);
    if (!synchronizer) return { success: false };
    return synchronizer.pull(force);
  }
}

const remotesService = new RemotesService();
export default remotesService;
