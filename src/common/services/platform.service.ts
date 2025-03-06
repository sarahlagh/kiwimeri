import { getPlatforms, isPlatform } from '@ionic/react';

class PlatformService {
  public isAndroid() {
    return isPlatform('android');
  }

  public isWeb() {
    return isPlatform('desktop') && getPlatforms().length === 1;
  }

  public isDev() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any)['__REACT_DEVTOOLS_GLOBAL_HOOK__'] != undefined;
  }

  public getPlatforms() {
    return getPlatforms();
  }
}

const platformService = new PlatformService();
export default platformService;
