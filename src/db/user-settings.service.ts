import { Store } from 'tinybase/store';
import { useValue } from 'tinybase/ui-react';
import storageService from './storage.service';

class UserSettingsService {
  private readonly spaceSettingsTable = 'spaceSettings';

  public useTheme() {
    return useValue('theme', storageService.getStore() as unknown as Store);
  }

  public setTheme(theme: 'light' | 'dark') {
    storageService.getStore().setValue('theme', theme);
  }

  public getCurrentFolder() {
    return storageService
      .getStore()
      .getCell(
        this.spaceSettingsTable,
        storageService.getCurrentSpace(),
        'currentFolder'
      )
      ?.valueOf() as string;
  }

  public useCurrentFolder() {
    return useValue(
      'currentFolder',
      storageService.getStore() as unknown as Store
    );
  }

  public setCurrentFolder(parent: string) {
    storageService
      .getStore()
      .setCell(
        this.spaceSettingsTable,
        storageService.getCurrentSpace(),
        'currentFolder',
        parent
      );
  }
}

const userSettingsService = new UserSettingsService();
export default userSettingsService;
