import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import { appLog } from '@/log';

const logLevels = {
  trace: 1000,
  debug: 500,
  info: 100,
  warn: 50,
  error: 0
};

type Method = (message?: any, ...optionalParams: any[]) => void;
const originalConsole = { ...console };

const fnFactory =
  (origMethod: Method, level: 'trace' | 'debug' | 'info' | 'warn' | 'error') =>
  (message?: any, ...optionalParams: any[]) => {
    if (logLevels[appConfig.LOG_LEVEL] >= logLevels[level]) {
      if (optionalParams) {
        if (platformService.isAndroid()) {
          appLog.addLog(level, message, optionalParams);
        } else {
          origMethod(message, ...optionalParams);
        }
      } else {
        if (platformService.isAndroid()) {
          appLog.addLog(level, message);
        } else {
          origMethod(message);
        }
      }
    }
  };

console.trace = fnFactory(originalConsole.trace, 'trace');
console.debug = fnFactory(originalConsole.debug, 'debug');
console.log = fnFactory(originalConsole.log, 'info');
console.warn = fnFactory(originalConsole.warn, 'warn');
console.error = fnFactory(originalConsole.error, 'error');
