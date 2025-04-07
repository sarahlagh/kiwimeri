import { KMStorageProvider } from '@repo/kiwimeri-sync-core';
import { pcloudClient, PCloudConf } from '@repo/kiwimeri-sync-pcloud';
import { Store } from 'tinybase/store';
import { useCell } from 'tinybase/ui-react';
import platformService from '../common/services/platform.service';
import { appConfig } from '../config';
import storageService from './storage.service';

class SyncConfigurationsService {
  private readonly table = 'syncConfigurations';

  public async initSyncConnection(space: string) {
    const rowIds = (
      storageService.getStore().getRowIds(this.table) as string[]
    ).filter(id => id.startsWith(`${space}-`));
    if (!rowIds || rowIds.length < 1) {
      console.log('[storage] no initial sync configuration');
      return;
    }
    for (const rowId of rowIds) {
      const [space, type] = rowId.split('-');
      if (this.getCurrentTestStatus(type)) {
        console.log('[storage] found initial sync configurations', space, type);
        // TODO have factory for multiple conf
        this.configure(type, pcloudClient, this.getCurrentConfig(type));
      }
    }
  }

  public async configure(
    type: string,
    storageProvider: KMStorageProvider,
    initConfig: PCloudConf
  ) {
    let proxy = undefined;
    if (platformService.is(['web', 'electron']) && appConfig.HTTP_PROXY) {
      proxy = appConfig.HTTP_PROXY;
    }
    storageProvider.configure({
      proxy,
      ...initConfig
    });
    const newConf = await storageProvider.init(
      storageService.getCurrentSpace()
    );
    this.setCurrentConfig(type, newConf.config);
    return newConf.test;
  }

  public getCurrentTestStatus(type: string) {
    return (
      (storageService
        .getStore()
        .getCell(this.table, this.getRowId(type), 'test')
        ?.valueOf() as boolean) || false
    );
  }

  public useCurrentTestStatus(type: string) {
    return (
      (useCell(
        this.table,
        this.getRowId(type),
        'test',
        storageService.getStore() as unknown as Store
      )?.valueOf() as boolean) || false
    );
  }

  public setCurrentTestStatus(type: string, test: boolean) {
    storageService
      .getStore()
      .setCell(this.table, this.getRowId(type), 'test', test);
  }

  public getCurrentConfig(type: string) {
    const config = storageService
      .getStore()
      .getCell(this.table, this.getRowId(type), 'config')
      ?.valueOf() as string;
    if (config) {
      return JSON.parse(config);
    }
    return undefined;
  }

  public useCurrentConfig(type: string) {
    const config = useCell(
      this.table,
      this.getRowId(type),
      'config',
      storageService.getStore() as unknown as Store
    )?.valueOf() as string;
    if (config) {
      return JSON.parse(config);
    }
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public setCurrentConfig(type: string, config: any) {
    storageService
      .getStore()
      .setCell(
        this.table,
        this.getRowId(type),
        'config',
        JSON.stringify(config)
      );
  }

  private getRowId(type: string) {
    const space = storageService.getCurrentSpace();
    return `${space}-${type}`;
  }
}

export const syncConfigurationsService = new SyncConfigurationsService();
