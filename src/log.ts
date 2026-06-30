/* eslint-disable @typescript-eslint/no-explicit-any */

import { store } from './core/db/store';
import { StoreTables } from './core/db/store-constants';
import { AppLog, AppLogLevel } from './core/infra/log-model';
import { deviceSettings } from './domain/device-settings/device-settings.service';
import { dateToStr } from './shared/misc/date-utils';

const MAX_STRING_LENGTH = 10000; // max length for a single arg

export type AppLogResult = Required<AppLog> & {
  id: string;
  longLevelName: AppLogLevel;
};

const L = StoreTables.Logs;

class AppLogService {
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

  public gc(all = false) {
    const maxLogHistory = all ? 0 : deviceSettings.get('maxLogHistory');
    const rowCount = store.getRowCount(L);
    if (rowCount > maxLogHistory) {
      console.log('running log gc', rowCount - maxLogHistory);
      this.delLogs(rowCount - maxLogHistory);
    }
  }

  public getLongName(level: AppLogLevel) {
    return this.levelMap[level];
  }

  public addLog(level: AppLogLevel, args: any[]) {
    store.addRow(L, {
      level: this.levelMap[level],
      message: this.format(args),
      ts: Date.now()
    });
  }

  private delLogs(limit: number) {
    store.transaction(() => {
      store.getSortedRowIds(L, 'ts', false, 0, limit).forEach(rowId => {
        store.delRow(L, rowId);
      });
    });
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

  public printLogs(logs: AppLogResult[]) {
    return logs
      .map(l => `${l.level} ${dateToStr('datetime', l.ts)} ${l.message}`)
      .join('\n');
  }
}

export const appLog = new AppLogService();
