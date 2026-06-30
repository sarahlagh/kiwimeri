import { appConfig } from '@/config';
import { AppLogLevel } from '@/core/infra/log-model';
import { plt } from '@/core/infra/platform';
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
  (origMethod: Method, level: AppLogLevel) =>
  (message?: any, ...optionalParams: any[]) => {
    // TODO override log level with user debugLog
    appLog.addLog(level, [message, ...optionalParams]);
    if (logLevels[appConfig.LOG_LEVEL] >= logLevels[level]) {
      origMethod(message, ...optionalParams);
    }
  };

if (!plt.isDev()) {
  console.trace = fnFactory(originalConsole.trace, 'trace');
  console.debug = fnFactory(originalConsole.debug, 'debug');
  console.log = fnFactory(originalConsole.log, 'info');
  console.warn = fnFactory(originalConsole.warn, 'warn');
  console.error = fnFactory(originalConsole.error, 'error');
}
