import { AnyData } from '@/core/db/types';

import { CloudStorageDriver } from '@/domain/synchronization/drivers/abstract.driver';
import {
  DriverFileInfo,
  FileReference
} from '@/domain/synchronization/drivers/model';
import { ReplicaRemoteState, ReplicaState } from '../replica-state/model';

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
    replicaState: ReplicaRemoteState;
  }>;

  protected async connectAttempt(fileRefs: FileReference[]): Promise<{
    connected: boolean;
    config: AnyData | null;
    lastRemoteChange: number;
    filesInfo?: DriverFileInfo[];
  }> {
    const { config, connected, filesInfo } = await this.driver
      .connect(fileRefs)
      .catch(() => ({ connected: false, config: null, filesInfo: undefined }));

    if (config && filesInfo) {
      return {
        connected,
        config,
        filesInfo,
        lastRemoteChange:
          filesInfo.length > 0
            ? Math.max(...filesInfo.map(fi => fi.updated))
            : 0
      };
    }
    return { connected, config, filesInfo, lastRemoteChange: 0 };
  }

  abstract hasNewChanges(
    lastPulled: number,
    cachedRemoteState?: ReplicaState
  ): Promise<{
    success: boolean;
    hasNewChanges?: boolean;
    remoteState?: ReplicaState;
  }>;

  // on push
  abstract acceptsChanges(
    data: AnyData,
    force?: boolean
  ): Promise<{
    success: boolean;
    didPush: boolean;
    updatedRemoteState?: ReplicaState;
  }>;

  // on pull
  abstract fetchChanges(
    lastPulled: number,
    force?: boolean
  ): Promise<{
    success: boolean;
    didPull: boolean;
    updatedRemoteState?: ReplicaState;
    data?: AnyData;
  }>;

  abstract destroy(): Promise<void>;
}
