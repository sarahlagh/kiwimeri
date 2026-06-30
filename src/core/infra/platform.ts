import { appConfig } from '@/config';
import { Capacitor } from '@capacitor/core';

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

  public isElectron() {
    return this.getPlatform() === 'electron';
  }

  public isRelease() {
    return appConfig.IS_RELEASE;
  }

  public getPlatform() {
    return appConfig.DEV_OVERRIDE_PLATFORM
      ? appConfig.DEV_OVERRIDE_PLATFORM
      : Capacitor.getPlatform();
  }

  public hasHighlightSupport() {
    return CSS.highlights !== undefined;
  }
}

export const plt = new PlatformService();
