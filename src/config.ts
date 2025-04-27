/* eslint-disable @typescript-eslint/no-explicit-any */
import { i18n } from '@lingui/core';
import {
  NEW_DOC_TITLE,
  NEW_FOLDER_TITLE,
  ROOT_FOLDER_TITLE
} from './constants';
import { LayerTypes } from './remote-storage/storage-provider.factory';

// hack to override VITE_ vars with docker container env
const dynConfig = {
  VITE_IS_RELEASE: '__dyn__',
  VITE_INTERNAL_HTTP_PROXY: '__dyn__',
  VITE_DEV_USE_HTTP_IF_POSSIBLE: '__dyn__',
  VITE_DEV_OVERRIDE_PLATFORM: '__dyn__',
  VITE_DEFAULT_STORAGE_LAYER: '__dyn__'
} as any;

class AppConfig implements ImportMetaEnv {
  KIWIMERI_VERSION = '0.0.0';
  IS_RELEASE = false;
  INTERNAL_HTTP_PROXY?: string;
  DEV_USE_HTTP_IF_POSSIBLE = false;
  DEV_OVERRIDE_PLATFORM?: 'web' | 'android' | 'electron';
  DEV_ENABLE_SPACE_INSPECTOR = true;
  DEV_ENABLE_STORE_INSPECTOR = true;
  DEFAULT_STORAGE_LAYER: LayerTypes = 'simple';

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
      if (dynConfig[k] && dynConfig[k] !== '__dyn__') {
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

// for where using lingui macros isn't possible
const I18N = {
  homeTitle: '',
  newDocTitle: '',
  newFolderTitle: ''
};
export function initGlobalTrans() {
  I18N.homeTitle = i18n._(ROOT_FOLDER_TITLE);
  I18N.newDocTitle = i18n._(NEW_DOC_TITLE);
  I18N.newFolderTitle = i18n._(NEW_FOLDER_TITLE);
}
export const getGlobalTrans = () => ({ ...I18N });
