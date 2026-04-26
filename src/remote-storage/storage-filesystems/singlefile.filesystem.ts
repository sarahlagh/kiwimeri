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
  protected logPrefix: string;

  public constructor(
    protected driver: CloudStorageDriver,
    opts?: SingleFileStorageOpts
  ) {
    super('single-file', driver);
    this.opts = opts || {
      filename: 'data'
    };
    this.filename = this.opts.filename;
    this.logPrefix = `[singlefile fs][filename: ${this.filename}, driver: ${this.driver.driverName}]`;
  }

  public async connect(filenames?: string[]): Promise<{
    config: AnyData | null;
    remoteState: RemoteState;
  }> {
    return this.connectAttempt(filenames ? filenames : [this.filename]);
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
    console.log(`${this.logPrefix}[acceptsChanges] will start pushing file`);
    const { success, driverInfo } = await this.driver.pushFile(
      this.filename,
      content
    );
    const updatedRemoteState = this.getRemoteState([driverInfo]);

    return { success, updatedRemoteState };
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

    console.log(
      `${this.logPrefix}[fetchChanges] checking for remote changes. last pulled:`,
      lastPulled
    );
    const { hasNewChanges, updatedRemoteState } =
      await this.hasNewChanges(lastPulled);

    if (!hasNewChanges) {
      console.log(
        `${this.logPrefix}[fetchChanges] remote did not change`,
        updatedRemoteState
      );
      return { success: true, didPull: false, updatedRemoteState };
    }
    console.log(
      `${this.logPrefix}[fetchChanges] remote did change, will pull file`,
      updatedRemoteState
    );
    const localInfo = updatedRemoteState.info as DriverFileInfo;

    const { success, content } = await this.driver.pullFile(
      localInfo.providerid,
      this.filename
    );
    if (content) {
      return {
        success,
        didPull: true,
        updatedRemoteState,
        data: JSON.parse(content)
      };
    }
    return { success, didPull: true, updatedRemoteState };
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
