import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import { INTERNAL_FORMAT } from '@/constants';
import {
  LayerTypes,
  storageLayerFactory
} from '@/remote-storage/storage-layer.factory';
import { StorageLayer } from '@/remote-storage/sync-types';
import { Persister } from 'tinybase/persisters/with-schemas';
import { useResultTable } from 'tinybase/ui-react';
import { createRemoteCloudPersister } from './persisters/remote-cloud-persister';
import storageService from './storage.service';
import { SpaceType } from './types/db-types';
import {
  AnyData,
  RemoteItemInfo,
  RemoteResult,
  RemoteState
} from './types/store-types';

class RemotesService {
  private readonly remotesTable = 'remotes';
  private readonly stateTable = 'remoteState';
  private readonly remoteItemsTable = 'remoteItems';

  private layer: LayerTypes = appConfig.DEFAULT_STORAGE_LAYER;
  private providers: Map<string, StorageLayer> = new Map();
  private remotePersisters: Map<string, Persister<SpaceType>> = new Map();

  private force = false;

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
    storageService
      .getStoreIndexes()
      .setIndexDefinition('byRemoteState', 'remoteItems', 'state');

    const remotes = this.getRemotes();
    const connectedRemotes = remotes.filter(
      remote => initAll || remote.connected
    );

    this.remotePersisters.forEach(p => {
      p.destroy();
    });
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
      await this.configure(remote, JSON.parse(remote.config));

      // TODO: factory depending on type
      this.remotePersisters.set(
        remote.id,
        createRemoteCloudPersister(
          storageService.getSpace(space),
          remote,
          this.providers.get(remote.id)!
        )
      );
    }
  }

  public async configure(remote: RemoteResult, config: AnyData) {
    let proxy = undefined;
    let useHttp = false;
    if (platformService.isWeb()) {
      proxy = appConfig.INTERNAL_HTTP_PROXY;
      useHttp = appConfig.DEV_USE_HTTP_IF_POSSIBLE;
    }
    this.providers.set(remote.id, storageLayerFactory(remote.type, this.layer));
    const storageProvider = this.providers.get(remote.id)!;
    storageProvider.configure(config, proxy, useHttp);
    const newConf = await storageProvider.init(remote.state);

    storageService.getStore().transaction(() => {
      storageService.setCell(
        this.remotesTable,
        remote.id,
        'config',
        JSON.stringify(newConf.config)
      );
      this.updateRemoteStateInfo(remote.state, newConf.remoteState);
    });

    this.setRemoteStateConnected(remote.state, newConf.connected);
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

  public getLastRemoteChange(state: string) {
    return (
      storageService.getCell<number>(
        this.stateTable,
        state || '-1',
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
    this.remotePersisters.delete(remote);
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

  public getCachedRemoteStateInfo(stateId: string) {
    const row = storageService.getStore().getRow(this.stateTable, stateId);
    return {
      ...row,
      id: stateId,
      info: row.info ? JSON.parse(row.info as string) : undefined
    } as RemoteState;
  }

  public getCachedRemoteItemInfo(stateId: string) {
    const table = storageService.getStore().getTable(this.remoteItemsTable);
    const rowIds = storageService
      .getStoreIndexes()
      .getSliceRowIds('byRemoteState', stateId);
    const remoteItems: RemoteItemInfo[] = [];
    rowIds.forEach(rowId => {
      remoteItems.push({
        ...table[rowId],
        id: rowId,
        info: table[rowId].info
          ? JSON.parse(table[rowId].info as string)
          : undefined
      } as RemoteItemInfo);
    });
    return remoteItems;
  }

  public updateRemoteStateInfo(stateId: string, remoteInfo: RemoteState) {
    storageService.getStore().transaction(() => {
      storageService.setCell(
        this.stateTable,
        stateId,
        'lastRemoteChange',
        remoteInfo.lastRemoteChange || 0
      );
      if (remoteInfo.info) {
        storageService.setCell(
          this.stateTable,
          stateId,
          'info',
          JSON.stringify(remoteInfo.info)
        );
      }
    });
  }

  public updateRemoteItemInfo(stateId: string, remoteItems: RemoteItemInfo[]) {
    const dbItems = this.getCachedRemoteItemInfo(stateId);
    const deletedItems = dbItems.filter(
      c => !remoteItems.find(i => i.item === c.item)
    );
    const updatedItems = dbItems.filter(
      c => remoteItems.find(i => i.item === c.item) !== undefined
    );
    const createdItems = remoteItems.filter(
      r => !dbItems.find(i => i.item === r.item)
    );
    if (
      deletedItems.length > 0 ||
      updatedItems.length > 0 ||
      createdItems.length > 0
    ) {
      // TODO paginate for transaction
      storageService.getStore().transaction(() => {
        // delete ones on local missing in remote
        deletedItems.forEach(remoteItem => {
          storageService
            .getStore()
            .delRow(this.remoteItemsTable, remoteItem.id!);
        });
        // update the existing ones
        updatedItems.forEach(remoteItem => {
          storageService
            .getStore()
            .setRow(this.remoteItemsTable, remoteItem.id!, {
              ...remoteItem,
              info: remoteItem.info
                ? JSON.stringify(remoteItem.info)
                : undefined
            });
        });
        // create the rest
        createdItems.forEach(remoteItem => {
          storageService.getStore().addRow(this.remoteItemsTable, {
            ...remoteItem,
            info: remoteItem.info ? JSON.stringify(remoteItem.info) : undefined
          });
        });
      });
    }
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

  public getPersister(remote: string) {
    return this.remotePersisters.get(remote);
  }

  public setForceMode(force: boolean) {
    this.force = force;
  }
  public getForceMode() {
    return this.force;
  }
}

const remotesService = new RemotesService();
export default remotesService;
