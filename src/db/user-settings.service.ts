import { ROOT_FOLDER } from '@/constants';
import storageService from './storage.service';

class UserSettingsService {
  private readonly spacesTable = 'spaces';

  public useTheme() {
    return storageService.useValue('theme');
  }

  public setTheme(theme: 'light' | 'dark') {
    storageService.setValue('theme', theme);
  }

  public getCurrentFolder() {
    return (
      storageService.getCell<string>(
        this.spacesTable,
        storageService.getSpaceId(),
        'currentFolder'
      ) || ROOT_FOLDER
    );
  }

  public useCurrentFolder() {
    return (
      storageService.useCell(
        this.spacesTable,
        storageService.getSpaceId(),
        'currentFolder'
      ) || ROOT_FOLDER
    );
  }

  public setCurrentFolder(folder: string) {
    storageService.setCell(
      this.spacesTable,
      storageService.getSpaceId(),
      'currentFolder',
      folder
    );
  }

  public getCurrentDocument() {
    return (
      storageService.getCell(
        this.spacesTable,
        storageService.getSpaceId(),
        'currentDocument'
      ) || undefined
    );
  }

  public setCurrentDocument(doc?: string) {
    if (doc) {
      storageService.setCell(
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
