import { RemoteState, RemoteWithState } from '@/db/types/store-types';
import { CloudStorageDriver } from '@/remote-storage/storage-drivers/abstract.driver';
import { CloudStorageFilesystem } from '@/remote-storage/storage-filesystems.v1/abstract.filesystem';
import { RemoteInfo } from '@/remote-storage/sync-types';

export class RollingFileFilesystem extends CloudStorageFilesystem {
  public constructor(protected driver: CloudStorageDriver) {
    super(driver);
  }

  configure(conf: any, proxy?: string, useHttp?: boolean): void {
    throw new Error('Method not implemented.');
  }
  getVersionFile(): string {
    throw new Error('Method not implemented.');
  }
  connect(
    remoteStateId?: string
  ): Promise<{ config: any; remoteState: RemoteState }> {
    throw new Error('Method not implemented.');
  }
  pull(
    remote: RemoteWithState,
    force = false
  ): Promise<{
    didPull: boolean;
    remoteInfo: RemoteInfo;
  }> {
    throw new Error('Method not implemented.');
  }
  push(
    remote: RemoteWithState,
    force = false
  ): Promise<{ remoteInfo: RemoteInfo }> {
    throw new Error('Method not implemented.');
  }
  destroy(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
