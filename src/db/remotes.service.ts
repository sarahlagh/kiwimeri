import { appConfig } from '@/config';
import { DEFAULT_SPACE_ID } from '@/constants';
import { store, storeQueries } from '@/core/db/store';
import { networkService } from '@/core/infra/network.service';
import { plt } from '@/core/infra/platform';
import { CloudStorageSynchronizer } from '@/remote-storage/synchronizers/abstract-synchronizer';
import { CompositeSynchronizer } from '@/remote-storage/synchronizers/composite-synchronizer';
import {
  useCellWithRef,
  useResultSortedRowIdsWithRef,
  useResultTableWithRef
} from './tinybase/hooks';
import { AnyData, RemoteResult } from './types/store-types';
import userSettingsService from './user-settings.service';

class RemotesService {
  private readonly storeId = 'store';
  private readonly remotesTable = 'remotes';
  private readonly stateTable = 'remoteState';

  private synchronizers: Map<string, CloudStorageSynchronizer> = new Map();

  // private networkListener: ConnectionStatusChangeListener | null = null;

  private fetchAllRemotesQuery(space: string) {
    const queryName = `fetchAllRemotesFor${space}`;
    if (!storeQueries.hasQuery(queryName)) {
      storeQueries.setQueryDefinition(
        queryName,
        'remotes',
        ({ select, join }) => {
          select('rank');
          select('name');
          select('type');
          select('config');
          select('state');
          select(this.stateTable, 'connected');
          join(this.stateTable, 'state');
        }
      );
    }
    return queryName;
  }

  public initSync() {
    if (plt.isSyncEnabled()) {
      networkService.onStatusUp(
        '[storage reinit]',
        () => {
          setTimeout(async () => {
            console.log(
              '[sync] network connected - will attempt to re init remotes'
            );
            await this.onReinit();
          });
        },
        true
      );
    }
  }

  public async onReinit() {
    await this.configureRemotes(DEFAULT_SPACE_ID);
  }

  public stopSync() {
    this.synchronizers.forEach(fs => {
      fs.destroy();
    });
    this.synchronizers.clear();
  }

  public async configureRemotes(space: string, initAll = false) {
    const remotes = this.getRemotes();
    const connectedRemotes = remotes.filter(
      remote => initAll || remote.connected
    );

    if (connectedRemotes.length < 1) {
      console.log('[sync] no initial sync configuration');
      return;
    }

    for (const remote of connectedRemotes) {
      console.log(
        '[sync] found initial sync configurations',
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
    if (plt.isWeb()) {
      proxy = userSettingsService.getInternalProxy();
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
      space = DEFAULT_SPACE_ID;
    }
    const queryName = this.fetchAllRemotesQuery(space);
    return storeQueries.getResultSortedRowIds(queryName, 'rank').map(rowId => {
      const row = storeQueries.getResultRow(queryName, rowId);
      return { ...row, id: rowId } as RemoteResult;
    });
  }

  public useRemotes() {
    const queryName = this.fetchAllRemotesQuery(DEFAULT_SPACE_ID);

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
      (store
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
    const state = store.addRow(this.stateTable, {
      connected: false,
      lastRemoteChange: 0
    });
    store.addRow(
      this.remotesTable,
      {
        rank,
        name,
        state,
        type,
        config: defaultConf ? JSON.stringify(defaultConf) : '{}'
      },
      false
    );
  }

  public async delRemote(remote: string) {
    store.transaction(() => {
      // update ranks
      const remaining = this.getRemotes().filter(r => r.id !== remote);
      for (let i = 0; i < remaining.length; i++) {
        store.setCell(this.remotesTable, remaining[i].id, 'rank', i);
      }
      // delete the row
      store.delRow(this.remotesTable, remote);
      store.delRow(this.stateTable, remote);
    });

    if (this.synchronizers.has(remote))
      await this.synchronizers.get(remote)?.destroy();

    this.synchronizers.delete(remote);
  }

  public setRemoteName(remote: string, name: string) {
    store.setCell(this.remotesTable, remote, 'name', name);
  }

  public setRemoteConfig(remote: string, config: AnyData) {
    store.setCell(this.remotesTable, remote, 'config', JSON.stringify(config));
  }

  public setRemoteStateConnected(remote: string, connected: boolean) {
    store.setCell(this.stateTable, remote, 'connected', connected);
  }

  public updateRemoteRank(currentRank: number, newRank: number) {
    store.transaction(() => {
      const remotes = this.getRemotes();
      if (currentRank < newRank) {
        for (let i = currentRank + 1; i < newRank + 1; i++) {
          store.setCell(this.remotesTable, remotes[i].id, 'rank', i - 1);
        }
      } else {
        for (let i = newRank; i < currentRank; i++) {
          store.setCell(this.remotesTable, remotes[i].id, 'rank', i + 1);
        }
      }
      store.setCell(
        this.remotesTable,
        remotes[currentRank].id,
        'rank',
        newRank
      );
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

  public async sync(remote: RemoteResult) {
    const synchronizer = this.synchronizers.get(remote.id);
    if (!synchronizer) return { success: false };
    return synchronizer.sync();
  }
}

const remotesService = new RemotesService();
export default remotesService;
