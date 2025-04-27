import { SpaceType } from '@/db/types/db-types';
import {
  LocalChange,
  RemoteItemInfo,
  RemoteState
} from '@/db/types/store-types';
import { Table as UntypedTable } from 'tinybase';
import { Content } from 'tinybase/with-schemas';

export type RemoteInfo = {
  remoteItems?: RemoteItemInfo[];
} & RemoteState;

export type DriverFileInfo = {
  providerid: string;
  filename: string;
  updated: number;
  hash?: string;
  size?: number;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export abstract class StorageProvider {
  constructor(protected driver: FileStorageDriver) {}

  public getName() {
    return `[${this.getVersionFile()}][${this.driver.driverName}]`;
  }

  abstract configure(conf: any, proxy?: string, useHttp?: boolean): void; // accept user input and save in local store

  abstract getVersionFile(): string;

  abstract init(remoteStateId?: string): Promise<{
    config: any;
    remoteState: RemoteState;
  }>;

  abstract pull(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    cachedRemoteInfo: RemoteInfo,
    force?: boolean
  ): Promise<{
    content?: Content<SpaceType>;
    remoteInfo: RemoteInfo;
  }>;

  abstract push(
    localContent: Content<SpaceType>,
    localChanges: LocalChange[],
    cachedRemoteInfo: RemoteInfo,
    force?: boolean
  ): Promise<{ remoteInfo: RemoteInfo }>;

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

export abstract class FileStorageDriver {
  public constructor(public driverName: string) {}

  public async init(names: string[]) {
    const { connected, filesInfo } = await this.fetchFilesInfo(names);

    console.log(`${this.driverName} client initialized`, {
      ...this.getConfig(),
      password: '*******'
    });

    return {
      config: this.getConfig(),
      connected,
      filesInfo
    };
  }

  public abstract configure(conf: any, proxy?: string, useHttp?: boolean): void; // accept user input and save in local store

  public abstract getConfig(): any | null;

  public abstract fetchFilesInfo(names: string[]): Promise<{
    connected: boolean;
    filesInfo: DriverFileInfo[];
  }>;

  public abstract pushFile(
    filename: string,
    content: string
  ): Promise<DriverFileInfo>;

  public abstract pullFile(
    providerid: string,
    filename: string
  ): Promise<{ content?: string }>;

  public abstract deleteFile(
    providerid: string,
    filename: string
  ): Promise<void>;
}
