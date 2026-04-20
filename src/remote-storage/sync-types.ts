import {
  CollectionItem,
  CollectionItemUpdatableFieldEnum
} from '@/collection/collection';
import {
  LocalChangeType,
  RemoteState,
  RemoteWithState
} from '@/db/types/store-types';
import { Table as UntypedTable } from 'tinybase';

export type RemoteInfo = {
  lastPulled: number;
} & RemoteState;

export type DriverFileInfo = {
  providerid: string;
  filename: string;
  updated: number;
  hash?: string;
  size?: number;
};

export type AfterSyncHistChange = Pick<
  Required<CollectionItem>,
  'id' | 'type' | 'parent'
> & {
  change: LocalChangeType;
  field?: CollectionItemUpdatableFieldEnum;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export abstract class CloudStorageFilesystem {
  constructor(protected driver: CloudStorageDriver) {}

  public getName() {
    return `[${this.getVersionFile()}][${this.driver.driverName}]`;
  }

  abstract configure(conf: any, proxy?: string, useHttp?: boolean): void; // accept user input and save in local store

  abstract getVersionFile(): string;

  abstract connect(remoteStateId?: string): Promise<{
    config: any;
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

export abstract class CloudStorageDriver {
  public constructor(public driverName: string) {}

  public async connect(names: string[]) {
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

  public abstract close(): Promise<void>;
}
