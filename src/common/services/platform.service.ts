import { useMediaQueryMatch } from '@/common/hooks/useMediaQueryMatch';
import { appConfig } from '@/config';
import { Capacitor } from '@capacitor/core';

class PlatformService {
  public isAndroid() {
    return this.getPlatform() === 'android';
  }

  public isWeb() {
    return this.getPlatform() === 'web';
  }

  public isElectron() {
    return this.getPlatform() === 'electron';
  }

  public is(platforms: string[]) {
    return platforms.find(platform => platform === this.getPlatform());
  }

  public isDev() {
    return this.isWeb() && appConfig.DEV;
  }

  public isRelease() {
    return appConfig.IS_RELEASE;
  }

  public getPlatform() {
    return appConfig.DEV_OVERRIDE_PLATFORM
      ? appConfig.DEV_OVERRIDE_PLATFORM
      : Capacitor.getPlatform();
  }

  public isWideEnough() {
    return useMediaQueryMatch('md');
  }
}

const platformService = new PlatformService();
export default platformService;
