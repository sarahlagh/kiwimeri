import { CollectionItemUpdatableFieldEnum } from '@/collection/collection';
import { DriverNames } from '@/remote-storage/storage-filesystem.factory';
import { ValueIdFromSchema } from 'tinybase/@types/_internal/store/with-schemas';
import { CellSchema } from 'tinybase/with-schemas';

export interface AnyData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

export type SerializableData = string | number | boolean;

export interface AnySerializableData {
  [k: string]: SerializableData;
}

export interface Space {
  currentNotebook?: string;
  currentFolder?: string;
  currentDocument?: string;
  currentPage?: string;
  lastLocalChange: number;
  lastPulled: number;
}

export enum LocalChangeType {
  add = 'a',
  update = 'u',
  delete = 'd',
  value = 'v'
}

export type LocalChangeTypeValues = 'a' | 'u' | 'd' | 'v';

export interface LocalChange {
  id?: string;
  space: string;
  item: string;
  change: LocalChangeType;
  field?: CollectionItemUpdatableFieldEnum;
  updated: number;
}

export interface Remote {
  id?: string;
  state?: string;
  name: string;
  space: string;
  rank: number;
  type: DriverNames;
  config?: string;
  formats: string;
}

export type RemoteResult = Required<Remote> &
  Required<Pick<RemoteState, 'connected'>>;

export interface RemoteState {
  id?: string;
  connected?: boolean;
  lastRemoteChange?: number;
  info?: AnyData;
}

export interface RemoteItemInfo {
  id?: string;
  state: string; // id in remote state table
  item: string; // id in collection table
  info?: AnyData;
}

export type AppLogDbLevel = 'T' | 'D' | 'L' | 'W' | 'E';
export interface AppLog {
  id?: string;
  ts: number;
  level: AppLogDbLevel;
  message: string;
}

type spacesEnum = keyof Required<Space>;
type localChangeEnum = keyof Required<Omit<LocalChange, 'id'>>;
type remoteEnum = keyof Required<Omit<Remote, 'id'>>;
type remoteStateEnum = keyof Required<Omit<RemoteState, 'id'>>;
type remoteItemInfoEnum = keyof Required<Omit<RemoteItemInfo, 'id'>>;
type appLogEnum = keyof Required<Omit<AppLog, 'id'>>;

export type StoreType = [
  {
    // settings per space that won't be persisted outside of the current client
    spaces: {
      [cellId in spacesEnum]: CellSchema;
    };
    localChanges: {
      [cellId in localChangeEnum]: CellSchema;
    };
    remotes: {
      [cellId in remoteEnum]: CellSchema;
    };
    remoteState: {
      [cellId in remoteStateEnum]: CellSchema;
    };
    remoteItems: {
      [cellId in remoteItemInfoEnum]: CellSchema;
    };
    logs: {
      [cellId in appLogEnum]: CellSchema;
    };
  },
  {
    theme: { type: 'string'; default: string };
    currentSpace: { type: 'string'; default: string };
    showDevTools: { type: 'boolean'; default: false };
    maxLogHistory: { type: 'number'; default: 500 };
    internalProxy: { type: 'string' };
    exportIncludeMetadata: { type: 'boolean'; default: true };
    exportInlinePages: { type: 'boolean'; default: true };
  }
];

export type StoreValue = ValueIdFromSchema<StoreType[1]>;
