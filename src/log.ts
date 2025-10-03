/* eslint-disable @typescript-eslint/no-explicit-any */

// TODO store in db

export type AppLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export type AppLog = {
  key: number;
  ts: number;
  level: AppLogLevel;
  levelShort: string;
  message: string;
};

class AppLogService {
  private internalId = 0;

  private levelMap = {
    trace: 'T',
    debug: 'D',
    info: 'L',
    warn: 'W',
    error: 'E'
  };

  private log: AppLog[] = [];

  public addLog(level: AppLogLevel, message?: any, optionalParams?: any[]) {
    this.log.push({
      key: this.internalId++,
      ts: Date.now(),
      level,
      levelShort: this.levelMap[level],
      message: this.format(message, optionalParams)
    });
  }

  private format(message?: any, optionalParams?: any[]) {
    let final = this.formatOne(message);
    if (optionalParams) {
      optionalParams.forEach(p => {
        final = `${final}, ${this.formatOne(p)}`;
      });
    }
    return final;
  }

  private formatOne(message?: any) {
    let final = '';
    if (message === null) {
      final = 'null';
    } else if (message === undefined) {
      final = 'undefined';
    } else if (typeof message === 'string') {
      final = message;
    } else {
      final = JSON.stringify(message);
    }
    return final;
  }

  public getLogs(filters?: AppLogLevel[]) {
    if (filters?.length || 0 > 0) {
      return [...this.log].filter(l => filters?.includes(l.level));
    }
    return [...this.log];
  }

  public printLogs(filters?: AppLogLevel[]) {
    return this.getLogs(filters)
      .map(
        l => `${l.levelShort} ${new Date(l.ts).toLocaleString()} ${l.message}`
      )
      .join('\n');
  }
}

export const appLog = new AppLogService();
