export type AppLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';
export const appLevels: AppLogLevel[] = [
  'trace',
  'debug',
  'info',
  'warn',
  'error'
];

type AppLogDbLevel = 'T' | 'D' | 'L' | 'W' | 'E';
export type AppLog = {
  ts: number;
  level: AppLogDbLevel;
  message: string;
};
export type AppLogResult = Required<AppLog> & {
  id: string;
  longLevelName: AppLogLevel;
};

export const logsSchema = {
  ts: { type: 'number' },
  level: { type: 'string' },
  message: { type: 'string' }
} as const satisfies Record<keyof AppLog, unknown>;
