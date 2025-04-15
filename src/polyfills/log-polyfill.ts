import platformService from '@/common/services/platform.service';
import { appLog } from '@/log';

if (platformService.isAndroid()) {
  type Method = (message?: any, ...optionalParams: any[]) => void;
  const originalConsole = { ...console };

  const fnFactory =
    (origMethod: Method, level: 'trace' | 'debug' | 'log' | 'warn' | 'error') =>
    (message?: any, ...optionalParams: any[]) => {
      if (optionalParams) {
        appLog.addLog(level, message, optionalParams);
        origMethod(message, ...optionalParams);
      } else {
        appLog.addLog(level, message);
        origMethod(message);
      }
    };

  console.trace = fnFactory(originalConsole.trace, 'trace');
  console.debug = fnFactory(originalConsole.debug, 'debug');
  console.log = fnFactory(originalConsole.log, 'log');
  console.error = fnFactory(originalConsole.error, 'error');
  console.warn = fnFactory(originalConsole.warn, 'warn');
}
