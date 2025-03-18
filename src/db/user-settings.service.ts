import { useValue } from 'tinybase/ui-react';
import storageService from './storage.service';

class UserSettingsService {
  public useTheme() {
    return useValue('theme');
  }

  public setTheme(theme: 'light' | 'dark') {
    storageService.getStore().setValue('theme', theme);
  }
}

const userSettingsService = new UserSettingsService();
export default userSettingsService;
