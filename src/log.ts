/* eslint-disable @typescript-eslint/no-explicit-any */

import { appConfig } from './config';

class AppLog {
  private internalId = 0;
  private log: {
    key: number;
    ts: number;
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    message?: any;
    optionalParams?: any[];
  }[] = [];

  public addLog(
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error',
    message?: any,
    optionalParams?: any[]
  ) {
    if (!appConfig.IS_RELEASE) {
      this.log.push({
        key: this.internalId++,
        ts: Date.now(),
        level,
        message,
        optionalParams
      });
    }
  }

  public getLogs() {
    return [...this.log];
  }
}

export const appLog = new AppLog();
