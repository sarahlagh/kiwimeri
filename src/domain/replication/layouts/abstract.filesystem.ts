import { AnyData, RemoteState } from '@/db/types/store-types';

import { CloudStorageDriver } from '@/domain/remotes/drivers/abstract.driver';
import { DriverFileInfo, FileReference } from '@/domain/remotes/drivers/model';
import { UpdatedRemoteState } from './model';

export abstract class CloudStorageFilesystemV2 {
  constructor(
    protected typeName: string,
    protected driver: CloudStorageDriver
  ) {}

  public getName() {
    return `[${this.typeName}][${this.driver.driverName}]`;
  }

  public configureDriver(config: AnyData, proxy?: string, useHttp?: boolean) {
    this.driver.configure(config, proxy, useHttp);
  }

  abstract connect(fileRefs: FileReference[]): Promise<{
    config: AnyData | null;
    remoteState: RemoteState;
  }>;

  protected async connectAttempt(fileRefs: FileReference[]): Promise<{
    config: AnyData | null;
    remoteState: RemoteState;
  }> {
    const { config, connected, filesInfo } = await this.driver
      .connect(fileRefs)
      .catch(() => ({ connected: false, config: null, filesInfo: null }));

    if (config && filesInfo) {
      const remoteState = this.buildRemoteState(filesInfo);
      return {
        config,
        remoteState: { ...remoteState, connected }
      };
    }
    return { config, remoteState: { connected } };
  }

  protected buildRemoteState(filesInfo: DriverFileInfo[]) {
    const remoteState: RemoteState = {
      connected: true,
      lastRemoteChange:
        filesInfo.length > 0 ? Math.max(...filesInfo.map(fi => fi.updated)) : 0
    };
    if (filesInfo.length === 1) {
      remoteState.info = filesInfo[0];
    } else {
      remoteState.info = filesInfo;
    }
    return remoteState;
  }

  abstract hasNewChanges(
    lastPulled: number,
    cachedRemoteState?: UpdatedRemoteState
  ): Promise<{
    success: boolean;
    hasNewChanges?: boolean;
    updatedRemoteState?: RemoteState;
  }>;

  // on push
  abstract acceptsChanges(
    data: AnyData,
    force?: boolean
  ): Promise<{
    success: boolean;
    didPush: boolean;
    updatedRemoteState?: RemoteState;
  }>;

  // on pull
  abstract fetchChanges(
    lastPulled: number,
    force?: boolean
  ): Promise<{
    success: boolean;
    didPull: boolean;
    updatedRemoteState?: RemoteState;
    data?: AnyData;
  }>;

  abstract destroy(): Promise<void>;
}
