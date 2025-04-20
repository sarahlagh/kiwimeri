export interface AnyData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

export interface Space {
  currentNotebook?: string;
  currentFolder?: string;
  currentDocument?: string;
  lastLocalChange: number;
}

export enum LocalChangeType {
  add = 'a',
  update = 'u',
  delete = 'd'
}

export type LocalChangeTypeValues = 'a' | 'u' | 'd';
export interface LocalChange {
  id?: string;
  space: string;
  item: string;
  change: LocalChangeType;
  field?: string;
  updated: number;
}

export interface Remote {
  id?: string;
  state?: string;
  name: string;
  space: string;
  rank: number;
  type: string;
  config?: string;
  formats: string;
}

export type RemoteResult = Required<
  Pick<Remote, 'id' | 'state' | 'name' | 'rank' | 'type' | 'config' | 'formats'>
> &
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
  bucket: string; // the filename
}
