export interface AnyData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

export type SerializableData = string | number | boolean;

export interface AnySerializableData {
  [k: string]: SerializableData;
}

export type AppLogDbLevel = 'T' | 'D' | 'L' | 'W' | 'E';
export interface AppLog {
  id?: string;
  ts: number;
  level: AppLogDbLevel;
  message: string;
}
