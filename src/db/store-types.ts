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

export interface Remote {
  id?: string;
  state?: string;
  name: string;
  space: string;
  rank: string;
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
  connected: boolean;
  lastRemoteChange: number;
  info?: AnyData;
}

export interface RemoteChangelog {
  id?: string;
  remote: string; // id in remote table
  item: string; // id in collection table
  providerId: string;
  lastRemoteChange: number;
  bucket?: string;
  metadata?: AnyData;
}
