import { appConfig } from '@/config';
import { Capacitor } from '@capacitor/core';
import { store } from '../db/store';

class PlatformService {
  public isAndroid() {
    return Capacitor.getPlatform() === 'android';
  }

  public isDev() {
    return this.isWeb() && appConfig.DEV;
  }

  public isWeb() {
    return this.getPlatform() === 'web';
  }

  public isRelease() {
    return appConfig.IS_RELEASE;
  }

  public getPlatform() {
    return appConfig.DEV_OVERRIDE_PLATFORM
      ? appConfig.DEV_OVERRIDE_PLATFORM
      : Capacitor.getPlatform();
  }

  public isSyncEnabled() {
    return !this.isWeb() || this.getInternalProxy().length > 0;
  }

  private getInternalProxy() {
    const val = store.getValue('internalProxy');
    return (val !== undefined ? val : appConfig.INTERNAL_HTTP_PROXY) || '';
  }
}

export const plt = new PlatformService();
