import { DriverNames } from '@/domain/remotes/drivers/model';

export interface AnyData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

export type SerializableData = string | number | boolean;

export interface AnySerializableData {
  [k: string]: SerializableData;
}

export interface Remote {
  id?: string;
  state?: string; // rename to stateId
  name: string;
  rank: number;
  type: DriverNames;
  config?: string;
}

export type RemoteResult = Required<Remote> &
  Required<Pick<RemoteState, 'connected'>>;

export interface RemoteState {
  id?: string;
  connected?: boolean;
  lastPulled?: number;
  lastRemoteChange?: number;
  info?: AnyData;
}

export interface RemoteWithState extends Remote, RemoteState {}

export type AppLogDbLevel = 'T' | 'D' | 'L' | 'W' | 'E';
export interface AppLog {
  id?: string;
  ts: number;
  level: AppLogDbLevel;
  message: string;
}

export type LocalCollectionSearchIndex = {
  id?: string;
  breadcrumb: string;
  contentPreview?: string;
};

export interface LocalCollectionAncestor {
  id?: string;
  parentId: string;
  childId: string;
  depth: number;
}
