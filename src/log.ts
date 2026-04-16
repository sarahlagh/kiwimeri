/* eslint-disable @typescript-eslint/no-explicit-any */

import { Row } from 'tinybase/store';
import { dateToStr } from './common/date-utils';
import storageService from './db/storage.service';
import {
  useResultSortedRowIdsWithRef,
  useTableWithRef
} from './db/tinybase/hooks';
import { AppLog, AppLogDbLevel } from './db/types/store-types';

export type AppLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';
export const appLevels: AppLogLevel[] = [
  'trace',
  'debug',
  'info',
  'warn',
  'error'
];

export type AppLogResult = Required<AppLog> & {
  longLevelName: AppLogLevel;
};

const MAX_STRING_LENGTH = 10000; // max length for a single arg

class AppLogService {
  private readonly storeId = 'store';
  private readonly table = 'logs';

  private levelMap = {
    trace: 'T',
    T: 'trace',
    debug: 'D',
    D: 'debug',
    info: 'L',
    L: 'info',
    warn: 'W',
    W: 'warn',
    error: 'E',
    E: 'error'
  };

  private fetchAllLogsQuery() {
    const queries = storageService.getStoreQueries();
    const queryName = `fetchAllLogs`;
    if (!queries.hasQuery(queryName)) {
      queries.setQueryDefinition(queryName, this.table, ({ select }) => {
        select('ts');
        select('level');
        select('message');
      });
    }
    return queryName;
  }

  public gc(all = false) {
    const maxLogHistory = all
      ? 0
      : storageService.getStore().getValue('maxLogHistory');
    const rowCount = storageService.getStore().getRowCount(this.table);
    if (rowCount > maxLogHistory) {
      console.log('running log gc', rowCount - maxLogHistory);
      this.delLogs(rowCount - maxLogHistory);
    }
  }

  public addLog(level: AppLogLevel, args: any[]) {
    storageService.getStore().addRow(this.table, {
      level: this.levelMap[level],
      message: this.format(args),
      ts: Date.now()
    });
  }

  public useLogs(filters?: AppLogLevel[], descending = false) {
    const table = useTableWithRef(this.storeId, this.table);
    const queryName = this.fetchAllLogsQuery();
    return useResultSortedRowIdsWithRef(
      this.storeId,
      queryName,
      'ts',
      descending
    )
      .map(rowId => {
        const row = table[rowId];
        return this.asLogResult(rowId, row);
      })
      .filter(l => (filters ? filters.includes(l.longLevelName) : true));
  }

  public getLogs(filters?: AppLogLevel[], descending = false) {
    const table = storageService.getStore().getTable(this.table);
    const queryName = this.fetchAllLogsQuery();
    return storageService
      .getStoreQueries()
      .getResultSortedRowIds(queryName, 'ts', descending)
      .map(rowId => {
        const row = table[rowId];
        return this.asLogResult(rowId, row);
      })
      .filter(l => (filters ? filters.includes(l.longLevelName) : true));
  }

  private delLogs(limit: number) {
    const queryName = this.fetchAllLogsQuery();
    storageService.getStore().transaction(() => {
      storageService
        .getStoreQueries()
        .getResultSortedRowIds(queryName, 'ts', false, 0, limit)
        .forEach(rowId => {
          storageService.getStore().delRow(this.table, rowId);
        });
    });
  }

  private asLogResult(rowId: string, row: Row) {
    return {
      ...row,
      longLevelName: this.levelMap[row.level as AppLogDbLevel] as AppLogLevel,
      id: rowId
    } as AppLogResult;
  }

  private format(args: any[]) {
    return args.map(param => this.stringify(param)).join(', ');
  }

  private jsonStringify(value: unknown) {
    const seen = new WeakSet<object>();

    const replacer = (_key: string, val: any) => {
      // primitives
      const t = typeof val;
      if (t === 'bigint') return `BigInt(${val.toString()})`;
      if (t === 'symbol') return val.toString();
      if (t === 'function') return `[Function ${val.name || 'anonymous'}]`;

      if (this.isDangerousObject(val)) {
        return `[${val.constructor?.name || 'Object'} - too large to serialize]`;
      }

      if (val instanceof Error) {
        const base: Record<string, any> = {
          name: val.name,
          message: val.message,
          stack: val.stack
        };
        // include cause if present
        if ('cause' in val) base.cause = (val as any).cause;
        // include other own (possibly non-enumerable) props
        for (const k of Object.getOwnPropertyNames(val)) {
          if (!(k in base)) base[k] = (val as any)[k];
        }
        return base;
      }

      if (val instanceof Map) {
        return { __type: 'Map', entries: Array.from(val.entries()) };
      }
      if (val instanceof Set) {
        return { __type: 'Set', values: Array.from(val.values()) };
      }

      // circulars
      if (val && typeof val === 'object') {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }

      return val;
    };

    try {
      const result = JSON.stringify(value, replacer);

      // Safety check: if result is too large, truncate it
      if (result.length > MAX_STRING_LENGTH) {
        return result.substring(0, MAX_STRING_LENGTH) + '...[truncated]';
      }

      return result;
    } catch {
      return '[unable to stringify argument]';
    }
  }

  private stringify(message?: any): string {
    const t = typeof message;
    if (message === null) {
      return 'null';
    }
    if (message === undefined) {
      return 'undefined';
    }
    if (t === 'string' || t === 'number' || t === 'boolean') {
      return message;
    }
    return this.jsonStringify(message);
  }

  private isDangerousObject(val: any): boolean {
    if (!val || typeof val !== 'object') return false;

    // DOM/Browser elements and nodes
    if (
      val instanceof Node ||
      val instanceof Element ||
      val instanceof Document ||
      val instanceof Window
    ) {
      return true;
    }

    // Canvas and graphics contexts
    if (
      val instanceof CanvasRenderingContext2D ||
      val instanceof WebGLRenderingContext ||
      val instanceof ImageData ||
      val instanceof OffscreenCanvas
    ) {
      return true;
    }

    // Ionic/React DOM references
    if (
      val instanceof HTMLElement ||
      val instanceof HTMLDocument ||
      val instanceof HTMLCollection ||
      val instanceof NodeList
    ) {
      return true;
    }

    // Large typed arrays (image data, audio buffers, etc.)
    if (ArrayBuffer.isView(val) && val.byteLength > 10000) {
      return true;
    }

    // File/Blob objects (can be large)
    if (val instanceof File || val instanceof Blob) {
      return true;
    }

    // Large objects by property count
    const keys = Object.keys(val).length;
    if (keys > 1000) {
      return true;
    }

    return false;
  }

  public printLogs(filters?: AppLogLevel[]) {
    return this.getLogs(filters)
      .map(l => `${l.level} ${dateToStr('datetime', l.ts)} ${l.message}`)
      .join('\n');
  }
}

export const appLog = new AppLogService();
