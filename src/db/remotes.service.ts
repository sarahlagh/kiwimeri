import { networkService } from '@/common/services/network.service';
import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import { INTERNAL_FORMAT } from '@/constants';
import {
  LayerTypes,
  storageFilesystemFactory
} from '@/remote-storage/storage-filesystem.factory';
import { CloudStorage, RemoteInfo } from '@/remote-storage/sync-types';
import { ConnectionStatusChangeListener } from '@capacitor/network';
import localChangesService from './local-changes.service';
import storageService from './storage.service';
import {
  useCellWithRef,
  useResultSortedRowIdsWithRef,
  useResultTableWithRef
} from './tinybase/hooks';
import {
  AnyData,
  RemoteItemInfo,
  RemoteResult,
  RemoteState
} from './types/store-types';

class RemotesService {
  private readonly storeId = 'store';
  private readonly remotesTable = 'remotes';
  private readonly stateTable = 'remoteState';
  private readonly remoteItemsTable = 'remoteItems';

  private layer: LayerTypes = appConfig.DEFAULT_STORAGE_LAYER;
  private filesystems: Map<string, CloudStorage> = new Map();

  private networkListener: ConnectionStatusChangeListener | null = null;

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

  public async initSync() {
    if (platformService.isSyncEnabled()) {
      this.initOnce();
      if (!this.networkListener) {
        this.networkListener = networkService.onStatusUp(
          () => {
            setTimeout(async () => {
              console.log(
                '[storage] network connected - will attempt to re init providers'
              );
              await this.configureRemotes(storageService.getSpaceId());
            });
          },
          true,
          '[storage reinit]'
        );
      }
    }
  }

  private initOnce() {
    storageService
      .getStoreIndexes()
      .setIndexDefinition('remoteItemsByState', 'remoteItems', 'state');
  }

  public stopSync() {
    this.filesystems.forEach(fs => {
      fs.destroy();
    });
    this.filesystems.clear();
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
    if (!this.filesystems.has(remote.id))
      this.filesystems.set(
        remote.id,
        storageFilesystemFactory(remote.type, this.layer)
      );
    const filesystem = this.filesystems.get(remote.id)!;
    filesystem.configure(config, proxy, useHttp);

    const networkStatus = networkService.getStatus();
    if (networkStatus && !networkStatus.connected) {
      // if no network, don't bother
      return false;
    }

    const newConf = await filesystem.connect(remote.state);

    if (newConf.config !== null) {
      storageService.getStore().transaction(() => {
        storageService
          .getStore()
          .setCell(
            this.remotesTable,
            remote.id,
            'config',
            JSON.stringify(newConf.config)
          );
        this.updateRemoteStateInfo(remote.state, newConf.remoteState);
      });
    }

    this.setRemoteStateConnected(
      remote.state,
      newConf.remoteState.connected || false
    );
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

    this.filesystems.delete(remote);
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
      .getSliceRowIds('remoteItemsByState', stateId);
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
      storageService
        .getStore()
        .setCell(
          this.stateTable,
          stateId,
          'lastRemoteChange',
          remoteInfo.lastRemoteChange || 0
        );
      if (remoteInfo.info) {
        storageService
          .getStore()
          .setCell(
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

  private updateRemoteInfo(
    state: string,
    remoteInfo: RemoteInfo,
    updateLocalChanges: boolean,
    clearLocalChanges: boolean
  ) {
    storageService.getStore().transaction(() => {
      if (updateLocalChanges) {
        localChangesService.setLastLocalChange(
          remoteInfo.lastRemoteChange || 0
        );
      }
      if (clearLocalChanges) {
        localChangesService.clear();
      }
      this.updateRemoteStateInfo(state, remoteInfo);
      if (remoteInfo.remoteItems) {
        this.updateRemoteItemInfo(state, remoteInfo.remoteItems);
      }
    });
  }

  public async pull(remote: RemoteResult, force = false) {
    const store = storageService.getSpace(remote.space);
    const localContent = store.getContent();
    const localChanges = localChangesService.getLocalChanges();
    const lastPulled = localChangesService.getLastPulled();
    const remoteState = this.getCachedRemoteStateInfo(remote.state);
    const remoteItems = this.getCachedRemoteItemInfo(remote.state);
    try {
      const filesystem = this.filesystems.get(remote.id)!;
      const resp = await filesystem.pull(
        localContent,
        localChanges,
        {
          ...remoteState,
          remoteItems,
          lastPulled
        },
        force
      );
      if (resp && resp.content) {
        this.updateRemoteInfo(
          remote.state,
          resp.remoteInfo,
          force || localChanges.length == 0,
          force || false
        );
        if (resp.remoteInfo.lastRemoteChange)
          localChangesService.setLastPulled(resp.remoteInfo.lastRemoteChange);
        storageService.getSpace().setContent(resp.content);
      }
    } catch (e) {
      console.error(
        'error pulling',
        remote.name,
        this.filesystems.get(remote.id)?.getName(),
        e
      );
    }
  }

  public async push(remote: RemoteResult, force = false) {
    const store = storageService.getSpace(remote.space);
    const localContent = store.getContent();
    const localChanges = localChangesService.getLocalChanges();
    const lastPulled = localChangesService.getLastPulled();
    const remoteState = this.getCachedRemoteStateInfo(remote.state);
    const remoteItems = this.getCachedRemoteItemInfo(remote.state);
    try {
      const filesystem = this.filesystems.get(remote.id)!;
      const resp = await filesystem.push(
        localContent,
        localChanges,
        {
          ...remoteState,
          remoteItems,
          lastPulled
        },
        force
      );
      this.updateRemoteInfo(remote.state, resp.remoteInfo, true, true);
      if (resp.remoteInfo.lastRemoteChange)
        localChangesService.setLastPulled(resp.remoteInfo.lastRemoteChange);
    } catch (e) {
      console.error(
        'error pushing',
        remote.name,
        this.filesystems.get(remote.id)?.getName(),
        e
      );
    }
  }
}

const remotesService = new RemotesService();
export default remotesService;
