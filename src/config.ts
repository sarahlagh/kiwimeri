import { i18n } from '@lingui/core';
import {
  NEW_DOC_TITLE,
  NEW_FOLDER_TITLE,
  ROOT_FOLDER_TITLE
} from './constants';

// use zod if it gets complex
type AppConfig = {
  /* meant for overriding the platform in dev mode, not production */
  VITE_OVERRIDE_PLATFORM: 'web' | 'android' | 'electron' | undefined;
  VITE_ENABLE_SPACE_INSPECTOR: boolean;
  VITE_ENABLE_STORE_INSPECTOR: boolean;
};

const defaultConfig: AppConfig = {
  VITE_OVERRIDE_PLATFORM: undefined,
  VITE_ENABLE_SPACE_INSPECTOR: true,
  VITE_ENABLE_STORE_INSPECTOR: true
};

const metaEnv = import.meta.env;
export const appConfig = {
  ...defaultConfig,
  ...metaEnv,
  VITE_ENABLE_SPACE_INSPECTOR:
    metaEnv['VITE_ENABLE_SPACE_INSPECTOR'] !== 'false',
  VITE_ENABLE_STORE_INSPECTOR:
    metaEnv['VITE_ENABLE_STORE_INSPECTOR'] !== 'false'
};

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
