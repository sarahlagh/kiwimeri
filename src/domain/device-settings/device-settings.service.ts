import { appConfig } from '@/config';
import { space } from '@/core/db/store';
import { SpaceValue, SpaceValueType } from '@/core/db/store-schema';
import { plt } from '@/core/infra/platform';
import { Theme } from './device-settings';

class DeviceSettingService {
  public get<S extends SpaceValue>(setting: S): SpaceValueType<S> {
    return space.getValue(setting);
  }

  public set<S extends SpaceValue>(setting: S, value: SpaceValueType<S>) {
    space.setValue(setting, value!);
  }

  public setTheme(theme: Theme) {
    space.setValue('theme', theme);
  }

  public getInternalProxy() {
    return space.getValue('internalProxy') || appConfig.INTERNAL_HTTP_PROXY;
  }

  public isSyncEnabled() {
    return !plt.isWeb() || deviceSettings.getInternalProxy()?.length || 0 > 0;
  }
}

export const deviceSettings = new DeviceSettingService();
