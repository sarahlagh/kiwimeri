/* eslint-disable @typescript-eslint/no-explicit-any */

import { appLog } from '../log/log';

type Method = (message?: any, ...optionalParams: any[]) => void;
const originalConsole = { ...console };

const fnFactory =
  (origMethod: Method, level: 'trace' | 'debug' | 'log' | 'warn' | 'error') =>
  (message?: any, optionalParams?: any[]) => {
    appLog.addLog(level, message, optionalParams);
    if (optionalParams) origMethod(message, optionalParams);
    else origMethod(message);
  };

console.trace = fnFactory(originalConsole.trace, 'trace');
console.debug = fnFactory(originalConsole.debug, 'debug');
console.log = fnFactory(originalConsole.log, 'log');
console.error = fnFactory(originalConsole.error, 'error');
console.warn = fnFactory(originalConsole.warn, 'warn');
