import { pcloudClient, PCloudConf } from '@/cloud/pcloud/pcloud';
import { KMStorageProvider } from '@/cloud/sync-core';
import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import { Store } from 'tinybase/store';
import { useCell } from 'tinybase/ui-react';
import storageService from './storage.service';
import { RemoteResult } from './store-types';

class RemotesService {
  private readonly remotesTable = 'remotes';
  private readonly stateTable = 'remoteState';

  private fetchAllRemotesQuery(space: string) {
    const queries = storageService.getStoreQueries();
    const queryName = `fetchAllRemotesFor${space}`;
    if (!queries.hasQuery(queryName)) {
      queries.setQueryDefinition(
        queryName,
        this.remotesTable,
        ({ select, join, where }) => {
          select('#');
          select('type');
          select('config');
          select('formats');
          join('remoteState', 'stateId');
          where('space', space);
        }
      );
    }
    return queryName;
  }

  public async initSyncConnection(space: string) {
    const queryName = this.fetchAllRemotesQuery(space);
    const table = storageService.getStoreQueries().getResultTable(queryName);
    const remotes = storageService
      .getResultSortedRowIds(queryName, '#')
      .map(rowId => {
        const row = table[rowId];
        return { ...row, id: rowId } as RemoteResult;
      });

    if (!remotes || remotes.length < 1) {
      console.log('[storage] no initial sync configuration');
      return;
    }

    console.debug('remotes', remotes);
    for (const remote of remotes) {
      if (remote.connected) {
        console.log(
          '[storage] found initial sync configurations',
          space,
          remote.name,
          remote.type
        );

        // TODO have factory for multiple conf
        this.configure(remote.type, pcloudClient, remote.config as PCloudConf);
      }
    }
  }

  // TODO remove, no more "current" here, that will be in new syncService
  public getCurrentType() {
    return 'pcloud'; // TODO
  }

  public getCurrentProvider(): KMStorageProvider {
    return pcloudClient; // TODO factory
  }

  public async configure(
    type: string,
    storageProvider: KMStorageProvider,
    initConfig: PCloudConf
  ) {
    let proxy = undefined;
    let useHttp = false;
    if (platformService.isWeb()) {
      proxy = appConfig.INTERNAL_HTTP_PROXY;
      useHttp = appConfig.DEV_USE_HTTP_IF_POSSIBLE;
    }
    storageProvider.configure(initConfig, proxy, useHttp);
    const newConf = await storageProvider.init(storageService.getSpaceId());
    this.setCurrentConfig(newConf.config, type);
    this.setCurrentLastRemoteChange(newConf.lastRemoteChange, type);

    storageService
      .getStore()
      .setCell(this.remotesTable, 'default-pcloud', '#', 0);
    storageService
      .getStore()
      .setCell(this.remotesTable, 'default-pcloud', 'space', 'default');
    return newConf.test;
  }

  public getCurrentConnectionStatus(type?: string) {
    if (!type) {
      type = this.getCurrentType();
    }
    return (
      storageService.getCell<boolean>(
        this.stateTable,
        'default-pcloud',
        'connected'
      ) || false
    );
  }

  public useCurrentConnectionStatus(type?: string) {
    if (!type) {
      type = this.getCurrentType();
    }
    return (
      (useCell(
        this.remotesTable,
        'default-pcloud',
        'connected',
        storageService.getStore() as unknown as Store
      )?.valueOf() as boolean) || false
    );
  }

  public setCurrentConnectionStatus(test: boolean, type?: string) {
    if (!type) {
      type = this.getCurrentType();
    }
    storageService
      .getStore()
      .setCell(this.stateTable, 'default-pcloud', 'connected', test);
  }

  public getCurrentConfig(type?: string) {
    if (!type) {
      type = this.getCurrentType();
    }
    const config = storageService
      .getStore()
      .getCell(this.remotesTable, 'default-pcloud', 'config')
      ?.valueOf() as string;
    if (config) {
      return JSON.parse(config);
    }
    return undefined;
  }

  public useCurrentConfig(type?: string) {
    if (!type) {
      type = this.getCurrentType();
    }
    const config = useCell(
      this.remotesTable,
      'default-pcloud',
      'config',
      storageService.getStore() as unknown as Store
    )?.valueOf() as string;
    if (config) {
      return JSON.parse(config);
    }
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public setCurrentConfig(config: any, type?: string) {
    if (!type) {
      type = this.getCurrentType();
    }
    storageService
      .getStore()
      .setCell(
        this.remotesTable,
        'default-pcloud',
        'config',
        JSON.stringify(config)
      );
  }

  public setCurrentLastRemoteChange(lastRemoteChange: number, type?: string) {
    if (!type) {
      type = this.getCurrentType();
    }
    storageService
      .getStore()
      .setCell(
        this.stateTable,
        'default-pcloud',
        'lastRemoteChange',
        lastRemoteChange
      );
  }

  public useCurrentHasLocalChanges() {
    const lastRemoteChange =
      (useCell(
        this.stateTable,
        'default-pcloud',
        'lastRemoteChange',
        storageService.getStore() as unknown as Store
      )?.valueOf() as number) || 0;

    const lastLocalChange = storageService.useLastLocalChange();
    return lastLocalChange > lastRemoteChange;
  }
}

export const remotesService = new RemotesService();
