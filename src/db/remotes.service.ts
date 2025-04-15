import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import { INTERNAL_FORMAT } from '@/constants';
import { KMPCloudClient } from '@/storage-providers/pcloud/pcloud';
import { StorageProvider } from '@/storage-providers/sync-core';
import { useResultTable } from 'tinybase/ui-react';
import storageService from './storage.service';
import { AnyData, RemoteResult } from './store-types';

class RemotesService {
  private readonly remotesTable = 'remotes';
  private readonly stateTable = 'remoteState';

  private providers: Map<string, StorageProvider> = new Map();

  private fetchAllRemotesQuery(space: string) {
    const queries = storageService.getStoreQueries();
    const queryName = `fetchAllRemotesFor${space}`;
    if (!queries.hasQuery(queryName)) {
      queries.setQueryDefinition(
        queryName,
        this.remotesTable,
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

  public async initSyncConnection(space: string, initAll = false) {
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
      this.configure(remote.id, remote.state, JSON.parse(remote.config));
    }
  }

  public async configure(
    remoteId: string,
    remoteStateId: string,
    initConfig: AnyData
  ) {
    let proxy = undefined;
    let useHttp = false;
    if (platformService.isWeb()) {
      proxy = appConfig.INTERNAL_HTTP_PROXY;
      useHttp = appConfig.DEV_USE_HTTP_IF_POSSIBLE;
    }
    // TODO have factory for multiple conf
    if (!this.providers.has(remoteId)) {
      this.providers.set(remoteId, new KMPCloudClient());
    }
    const storageProvider = this.providers.get(remoteId)!;
    storageProvider.configure(initConfig, proxy, useHttp);
    const newConf = await storageProvider.init(storageService.getSpaceId());

    storageService.getStore().transaction(() => {
      storageService.setCell(
        this.remotesTable,
        remoteId,
        'config',
        JSON.stringify(newConf.config)
      );
      this.setLastRemoteChange(remoteStateId, newConf.lastRemoteChange);
    });

    this.setRemoteStateConnected(remoteStateId, newConf.connected);
    return newConf.connected;
  }

  public getRemotes(space?: string) {
    if (!space) {
      space = storageService.getSpaceId();
    }
    const queryName = this.fetchAllRemotesQuery(space);
    return storageService
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

    const table = useResultTable(
      queryName,
      storageService.getUntypedStoreQueries()
    );
    return storageService
      .useResultSortedRowIds(queryName, 'rank')
      .map(rowId => {
        const row = table[rowId];
        return { ...row, id: rowId } as RemoteResult;
      });
  }

  public usePrimaryRemote() {
    const remotes = this.useRemotes();
    return remotes && remotes.length > 0 ? remotes[0] : undefined;
  }

  public usePrimaryLastRemoteChange() {
    const remote = this.usePrimaryRemote();
    return (
      storageService.useCell<number>(
        this.stateTable,
        remote?.state || '-1',
        'lastRemoteChange'
      ) || 0
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
      lastRemoteChange: 0,
      info: undefined
    });
    storageService.getStore().addRow(this.remotesTable, {
      rank,
      name,
      state,
      type,
      space: storageService.getSpaceId(),
      config: defaultConf ? JSON.stringify(defaultConf) : '{}',
      formats: INTERNAL_FORMAT
    });
  }

  public delRemote(remote: string) {
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
  }

  public setRemoteName(remote: string, name: string) {
    storageService.setCell(this.remotesTable, remote, 'name', name);
  }

  public setRemoteConfig(remote: string, config: AnyData) {
    storageService.setCell(
      this.remotesTable,
      remote,
      'config',
      JSON.stringify(config)
    );
  }

  public setRemoteStateConnected(remote: string, connected: boolean) {
    storageService.setCell(this.stateTable, remote, 'connected', connected);
  }

  public setLastRemoteChange(stateId: string, lastRemoteChange: number) {
    storageService.setCell(
      this.stateTable,
      stateId,
      'lastRemoteChange',
      lastRemoteChange
    );
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

  public getProvider(remote: string) {
    return this.providers.get(remote);
  }
}

export const remotesService = new RemotesService();
