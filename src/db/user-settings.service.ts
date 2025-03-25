import { useValue } from 'tinybase/ui-react';
import storageService from './storage.service';

class UserSettingsService {
  public useTheme() {
    return useValue('theme');
  }

  public setTheme(theme: 'light' | 'dark') {
    storageService.getStore().setValue('theme', theme);
  }

  public getCurrentFolder() {
    return storageService.getStore().getValue('currentFolder');
  }

  public useCurrentFolder() {
    return useValue('currentFolder');
  }

  public setCurrentFolder(parent: string) {
    storageService.getStore().setValue('currentFolder', parent);
  }
}

const userSettingsService = new UserSettingsService();
export default userSettingsService;
