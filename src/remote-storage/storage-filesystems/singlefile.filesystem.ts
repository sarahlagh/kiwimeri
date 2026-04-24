import { AnyData, RemoteState } from '@/db/types/store-types';
import { CloudStorageDriver } from '../storage-drivers/abstract.driver';
import { DriverFileInfo } from '../sync-types';
import { CloudStorageFilesystemV2 } from './abstract.filesystem';

export type SingleFileStorageOpts = {
  filename: string;
};

export class SingleFileStorage extends CloudStorageFilesystemV2 {
  protected readonly version = 2;
  protected opts: SingleFileStorageOpts;
  protected filename: string;

  public constructor(
    protected driver: CloudStorageDriver,
    opts?: SingleFileStorageOpts
  ) {
    super('single-file', driver);
    this.opts = opts || {
      filename: 'data'
    };
    this.filename = this.opts.filename;
  }

  public async connect(): Promise<{
    config: AnyData | null;
    remoteState: RemoteState;
  }> {
    return this.connectAttempt([this.filename]);
  }

  public async destroy() {
    this.driver.close();
  }

  public async hasNewChanges(lastPulled: number): Promise<{
    hasNewChanges: boolean;
    updatedRemoteState: RemoteState;
  }> {
    if (!this.driver.getConfig()) {
      throw new Error(`uninitialized ${this.driver.driverName} config`);
    }
    const { filesInfo } = await this.driver.fetchFilesInfo([this.filename]);
    const updatedRemoteState = this.getRemoteState(filesInfo);
    const localInfo = updatedRemoteState.info as DriverFileInfo;
    const newLastRemoteChange = updatedRemoteState.lastRemoteChange || 0;
    const hasNewChanges = localInfo && lastPulled < newLastRemoteChange;
    return {
      hasNewChanges,
      updatedRemoteState
    };
  }

  // on push
  public async acceptsChanges(data: AnyData) {
    if (!this.driver.getConfig()) {
      throw new Error(`uninitialized ${this.driver.driverName} config`);
    }
    const content = JSON.stringify(data);
    const driverInfo = await this.driver.pushFile(this.filename, content);
    const updatedRemoteState = this.getRemoteState([driverInfo]);

    return { success: false, updatedRemoteState };
  }

  // on pull
  public async fetchChanges(lastPulled: number): Promise<{
    success: boolean;
    didPull: boolean;
    updatedRemoteState: RemoteState;
    data?: AnyData;
  }> {
    if (!this.driver.getConfig()) {
      throw new Error(`uninitialized ${this.driver.driverName} config`);
    }

    const { hasNewChanges, updatedRemoteState } =
      await this.hasNewChanges(lastPulled);

    if (!hasNewChanges) {
      console.debug('[pull] nothing to pull', updatedRemoteState);
      return { success: true, didPull: false, updatedRemoteState };
    }
    const localInfo = updatedRemoteState.info as DriverFileInfo;

    const { content } = await this.driver.pullFile(
      localInfo.providerid,
      this.filename
    );
    if (content) {
      return {
        success: true,
        didPull: true,
        updatedRemoteState,
        data: JSON.parse(content)
      };
    }
    return { success: false, didPull: true, updatedRemoteState };
  }

  private getRemoteState(filesInfo: DriverFileInfo[]) {
    const remoteState: RemoteState = {
      connected: true,
      lastRemoteChange:
        filesInfo.length > 0 ? Math.max(...filesInfo.map(fi => fi.updated)) : 0
    };
    if (filesInfo.length > 0) {
      remoteState.info = filesInfo[0];
    }
    return remoteState;
  }
}
