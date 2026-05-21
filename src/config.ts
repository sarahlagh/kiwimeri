/* eslint-disable @typescript-eslint/no-explicit-any */

import { AppLogLevel } from './core/infra/log-model';

// hack to override VITE_ vars with docker container env
const dynConfig = {
  VITE_IS_RELEASE: '__dyn__',
  VITE_LOG_LEVEL: '__dyn__',
  VITE_INTERNAL_HTTP_PROXY: '__dyn__',
  VITE_DEV_USE_HTTP_IF_POSSIBLE: '__dyn__',
  VITE_DEV_OVERRIDE_PLATFORM: '__dyn__'
} as any;

class AppConfig implements ImportMetaEnv {
  KIWIMERI_VERSION = '0.0.0';
  LOG_LEVEL: AppLogLevel = 'info';
  IS_RELEASE = false;
  INTERNAL_HTTP_PROXY?: string;
  DEV_USE_HTTP_IF_POSSIBLE = false;
  /** @deprecated */
  DEV_OVERRIDE_PLATFORM?: 'web' | 'android' | 'electron';
  DEV_ENABLE_INSPECTOR = true;

  constructor(metaEnv: ImportMetaEnv) {
    // transform VITE_ env from .env file
    const defaultConfig = { ...(this as any) };
    const viteAppConfig = { ...defaultConfig, ...metaEnv };
    const transformedConfig = {} as any;
    Object.keys(viteAppConfig).forEach(k => {
      const finalKey = k.replace('VITE_', '');
      if (finalKey !== k) {
        // transform boolean into correct type
        if (typeof defaultConfig[finalKey] === 'boolean') {
          viteAppConfig[k] =
            metaEnv[k] !== undefined
              ? metaEnv[k] === 'true'
              : defaultConfig[finalKey];
        }
      }
      transformedConfig[finalKey] = viteAppConfig[k];
    });

    // hack to override VITE_ vars with docker container env
    Object.keys(dynConfig).forEach(k => {
      if (dynConfig[k] !== undefined && dynConfig[k] !== '__dyn__') {
        const finalKey = k.replace('VITE_', '');
        if (dynConfig[k] === 'true' || dynConfig[k] === 'false') {
          dynConfig[k] = dynConfig[k] === 'true';
        }
        transformedConfig[finalKey] = dynConfig[k];
      }
    });

    Object.assign(this, transformedConfig);
  }

  // implements ImportMetaEnv
  BASE_URL!: string;
  MODE!: string;
  DEV!: boolean;
  PROD!: boolean;
  SSR!: boolean;
  [key: string]: any;
}

const metaEnv = import.meta.env;
export const appConfig = new AppConfig(metaEnv);
