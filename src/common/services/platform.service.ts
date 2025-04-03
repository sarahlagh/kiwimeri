import { Capacitor } from '@capacitor/core';
import { appConfig } from '../../config';
import { useMediaQueryMatch } from '../hooks/useMediaQueryMatch';

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

  public getPlatform() {
    return appConfig.OVERRIDE_PLATFORM
      ? appConfig.OVERRIDE_PLATFORM
      : Capacitor.getPlatform();
  }

  public isWideEnough() {
    return useMediaQueryMatch('md');
  }
}

const platformService = new PlatformService();
export default platformService;
