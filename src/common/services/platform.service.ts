import { Capacitor } from '@capacitor/core';
import { appConfig } from '../../config';
import { useMediaQueryMatch } from '../hooks/useMediaQueryMatch';

class PlatformService {
  public isAndroid() {
    return appConfig.VITE_OVERRIDE_PLATFORM
      ? appConfig.VITE_OVERRIDE_PLATFORM === 'android'
      : this.getPlatform() === 'android';
  }

  public isWeb() {
    return appConfig.VITE_OVERRIDE_PLATFORM
      ? appConfig.VITE_OVERRIDE_PLATFORM === 'web'
      : this.getPlatform() === 'web';
  }

  public isDev() {
    return this.isWeb() && appConfig.DEV;
  }

  public getPlatform() {
    return Capacitor.getPlatform();
  }

  public isWideEnough() {
    return useMediaQueryMatch('md');
  }
}

const platformService = new PlatformService();
export default platformService;
