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
