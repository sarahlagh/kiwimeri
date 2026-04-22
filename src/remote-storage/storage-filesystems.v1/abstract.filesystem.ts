import { AnyData, RemoteState, RemoteWithState } from '@/db/types/store-types';
import { Table as UntypedTable } from 'tinybase';
import { CloudStorageDriver } from '../storage-drivers/abstract.driver';
import { RemoteInfo } from '../sync-types';

export abstract class CloudStorageFilesystemV1 {
  constructor(protected driver: CloudStorageDriver) {}

  public getName() {
    return `[${this.getVersionFile()}][${this.driver.driverName}]`;
  }

  abstract configure(conf: AnyData, proxy?: string, useHttp?: boolean): void; // accept user input and save in local store

  abstract getVersionFile(): string;

  abstract connect(remoteStateId?: string): Promise<{
    config: AnyData | null;
    remoteState: RemoteState;
  }>;

  abstract pull(
    state: RemoteWithState,
    force?: boolean
  ): Promise<{
    didPull: boolean;
    remoteInfo: RemoteInfo;
  }>;

  abstract push(
    state: RemoteWithState,
    force?: boolean
  ): Promise<{ remoteInfo: RemoteInfo }>;

  abstract destroy(): Promise<void>;

  protected toMap<T>(obj?: UntypedTable) {
    const map: Map<string, T> = new Map();
    if (obj) {
      Object.keys(obj).forEach(id => {
        map.set(id, { ...(obj[id] as unknown as T), id });
      });
    }
    return map;
  }
}
