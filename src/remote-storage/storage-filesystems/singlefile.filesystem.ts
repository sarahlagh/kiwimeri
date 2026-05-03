import { AnyData, RemoteState } from '@/db/types/store-types';
import { getUniqueId } from 'tinybase/common';
import {
  CloudStorageDriver,
  FileReference
} from '../storage-drivers/abstract.driver';
import { DriverFileInfo } from '../sync-types';
import { CloudStorageFilesystemV2 } from './abstract.filesystem';

export type SingleFileStorageOpts = {
  filename: string;
};

export class SingleFileStorage extends CloudStorageFilesystemV2 {
  protected opts: SingleFileStorageOpts;
  protected filename: string;
  protected logPrefix: string;

  public constructor(
    protected logName: string,
    protected driver: CloudStorageDriver,
    opts?: SingleFileStorageOpts
  ) {
    super('single-file', driver);
    this.opts = opts || {
      filename: 'data'
    };
    this.filename = this.opts.filename;
    this.logPrefix = `[singlefile fs][${logName}][${this.driver.driverName}]`;
  }

  public async connect(fileRefs?: FileReference[]): Promise<{
    config: AnyData | null;
    remoteState: RemoteState;
  }> {
    return this.connectAttempt(
      fileRefs ? fileRefs : [{ filename: this.filename }]
    );
  }

  public async destroy() {
    this.driver.close();
  }

  public async hasNewChanges(lastPulled: number) {
    const { success, filesInfo } = await this.driver.fetchFilesInfo([
      { filename: this.filename }
    ]);
    if (success && filesInfo) {
      const updatedRemoteState = this.getRemoteState(filesInfo);
      const localInfo = updatedRemoteState.info as DriverFileInfo;
      const newLastRemoteChange = updatedRemoteState.lastRemoteChange || 0;
      const hasNewChanges = localInfo && lastPulled < newLastRemoteChange;
      return {
        success: true,
        hasNewChanges,
        updatedRemoteState
      };
    }
    return { success: false };
  }

  // on push
  public async acceptsChanges(data: AnyData) {
    const content = JSON.stringify(data);
    console.log(`${this.logPrefix}[acceptsChanges] will start pushing file`);

    const tempName = `${getUniqueId()}.${this.filename}.part`;
    console.debug(
      `${this.logPrefix}[acceptsChanges] push to temporary file ${tempName}`
    );
    const { success: pushSuccess, driverInfo: tempDriverInfo } =
      await this.driver.pushFile({ filename: tempName }, content);
    if (!pushSuccess || !tempDriverInfo) {
      setTimeout(async () => this.driver.deleteFile({ filename: tempName }));
      return { success: false, didPush: true };
    }
    // TODO check driverInfo, hash, size?

    console.debug(
      `${this.logPrefix}[acceptsChanges] promote ${tempName} to ${this.filename}`
    );
    const { success: renameSuccess, driverInfo } = await this.driver.renameFile(
      {
        filename: tempName,
        providerid: tempDriverInfo.providerid
      },
      this.filename
    );
    if (!renameSuccess || !driverInfo) {
      // TODO cleanup the .part file?
      return { success: false, didPush: true };
    }
    // consider file pushed
    const updatedRemoteState = this.getRemoteState([driverInfo]);
    updatedRemoteState.lastPulled = updatedRemoteState.lastRemoteChange;
    return { success: true, didPush: true, updatedRemoteState };
  }

  // on pull
  public async fetchChanges(
    lastPulled: number,
    force = false
  ): Promise<{
    success: boolean;
    didPull: boolean;
    updatedRemoteState?: RemoteState;
    data?: AnyData;
  }> {
    console.log(
      `${this.logPrefix}[fetchChanges] checking for remote changes. last pulled:`,
      lastPulled
    );
    const {
      success: lookupSuccess,
      hasNewChanges,
      updatedRemoteState
    } = await this.hasNewChanges(lastPulled);
    if (!lookupSuccess) return { success: false, didPull: false };

    if (!force && !hasNewChanges) {
      console.log(
        `${this.logPrefix}[fetchChanges] remote did not change`,
        updatedRemoteState
      );
      return { success: lookupSuccess, didPull: false, updatedRemoteState };
    }
    if (!updatedRemoteState?.info) {
      console.log(
        `${this.logPrefix}[fetchChanges] remote not found, will not pull`
      );
      return { success: lookupSuccess, didPull: false };
    }
    console.log(
      `${this.logPrefix}[fetchChanges] remote did change, will pull file`,
      updatedRemoteState
    );
    const localInfo = updatedRemoteState!.info as DriverFileInfo;

    const { success, content } = await this.driver.pullFile({
      filename: this.filename,
      providerid: localInfo.providerid
    });
    if (updatedRemoteState) {
      updatedRemoteState.lastPulled = updatedRemoteState?.lastRemoteChange;
    }
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
