/* eslint-disable @typescript-eslint/no-explicit-any */

class AppLog {
  private internalId = 0;
  private log: {
    key: number;
    ts: number;
    level: 'trace' | 'debug' | 'log' | 'warn' | 'error';
    message?: any;
    optionalParams?: any[];
  }[] = [];

  public addLog(
    level: 'trace' | 'debug' | 'log' | 'warn' | 'error',
    message?: any,
    optionalParams?: any[]
  ) {
    this.log.push({
      key: this.internalId++,
      ts: Date.now(),
      level,
      message,
      optionalParams
    });
  }

  public getLogs() {
    return [...this.log];
  }
}

export const appLog = new AppLog();
