import { ROOT_FOLDER } from '@/constants';
import storageService from './storage.service';
import { useCellWithRef, useValueWithRef } from './tinybase/hooks';

class UserSettingsService {
  private readonly storeId = 'store';
  private readonly spacesTable = 'spaces';

  public useTheme() {
    return useValueWithRef(this.storeId, 'theme');
  }

  public setTheme(theme: 'light' | 'dark') {
    storageService.getStore().setValue('theme', theme);
  }

  public getCurrentFolder() {
    return (
      (storageService
        .getStore()
        .getCell(this.spacesTable, storageService.getSpaceId(), 'currentFolder')
        ?.valueOf() as string) || ROOT_FOLDER
    );
  }

  public useCurrentFolder() {
    return (
      useCellWithRef<string>(
        this.storeId,
        this.spacesTable,
        storageService.getSpaceId(),
        'currentFolder'
      ) || ROOT_FOLDER
    );
  }

  public setCurrentFolder(folder: string) {
    storageService
      .getStore()
      .setCell(
        this.spacesTable,
        storageService.getSpaceId(),
        'currentFolder',
        folder
      );
  }

  public getCurrentDocument() {
    return (
      storageService
        .getStore()
        .getCell(
          this.spacesTable,
          storageService.getSpaceId(),
          'currentDocument'
        ) || undefined
    );
  }

  public setCurrentDocument(doc?: string) {
    if (doc) {
      storageService
        .getStore()
        .setCell(
          this.spacesTable,
          storageService.getSpaceId(),
          'currentDocument',
          doc
        );
    } else {
      storageService
        .getStore()
        .delCell(
          this.spacesTable,
          storageService.getSpaceId(),
          'currentDocument'
        );
    }
  }
}

const userSettingsService = new UserSettingsService();
export default userSettingsService;
