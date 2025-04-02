import { Store } from 'tinybase/store';
import { useCell, useValue } from 'tinybase/ui-react';
import { ROOT_FOLDER } from '../constants';
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
    return (
      (storageService
        .getStore()
        .getCell(
          this.spaceSettingsTable,
          storageService.getCurrentSpace(),
          'currentFolder'
        )
        ?.valueOf() as string) || ROOT_FOLDER
    );
  }

  public useCurrentFolder() {
    return (
      useCell(
        this.spaceSettingsTable,
        storageService.getCurrentSpace(),
        'currentFolder',
        storageService.getStore() as unknown as Store
      )?.valueOf() || ROOT_FOLDER
    );
  }

  public setCurrentFolder(folder: string) {
    storageService
      .getStore()
      .setCell(
        this.spaceSettingsTable,
        storageService.getCurrentSpace(),
        'currentFolder',
        folder
      );
  }
}

const userSettingsService = new UserSettingsService();
export default userSettingsService;
