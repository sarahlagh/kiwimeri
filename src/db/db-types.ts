export interface AnyData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

export interface SyncConfiguration {
  id?: string;
  test?: boolean;
  config?: AnyData;
}
