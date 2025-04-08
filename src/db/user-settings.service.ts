import { Store } from 'tinybase/store';
import { useCell, useValue } from 'tinybase/ui-react';
import { ROOT_FOLDER } from '../constants';
import storageService from './storage.service';

class UserSettingsService {
  private readonly spacesTable = 'spaces';

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
          this.spacesTable,
          storageService.getCurrentSpace(),
          'currentFolder'
        )
        ?.valueOf() as string) || ROOT_FOLDER
    );
  }

  public useCurrentFolder() {
    return (
      useCell(
        this.spacesTable,
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
        this.spacesTable,
        storageService.getCurrentSpace(),
        'currentFolder',
        folder
      );
  }

  public getCurrentDocument() {
    return (
      (storageService
        .getStore()
        .getCell(
          this.spacesTable,
          storageService.getCurrentSpace(),
          'currentDocument'
        )
        ?.valueOf() as string) || undefined
    );
  }

  public setCurrentDocument(doc?: string) {
    if (doc) {
      storageService
        .getStore()
        .setCell(
          this.spacesTable,
          storageService.getCurrentSpace(),
          'currentDocument',
          doc
        );
    } else {
      storageService
        .getStore()
        .delCell(
          this.spacesTable,
          storageService.getCurrentSpace(),
          'currentDocument'
        );
    }
  }
}

const userSettingsService = new UserSettingsService();
export default userSettingsService;
