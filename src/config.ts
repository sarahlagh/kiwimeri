import { i18n } from '@lingui/core';
import { ROOT_FOLDER_TITLE } from './constants';

// use zod if it gets complex
type AppConfig = {
  /* meant for overriding the platform in dev mode, not production */
  VITE_OVERRIDE_PLATFORM: 'web' | 'android' | 'electron' | undefined;
};

const defaultConfig: AppConfig = {
  VITE_OVERRIDE_PLATFORM: undefined
};

export const appConfig = { ...defaultConfig, ...import.meta.env };

// for where using lingui macros isn't possible
const I18N = {
  homeTitle: ''
};
export function initGlobalTrans() {
  I18N.homeTitle = i18n._(ROOT_FOLDER_TITLE);
}
export const getGlobalTrans = () => ({ ...I18N });
