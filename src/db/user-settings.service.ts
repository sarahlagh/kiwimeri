import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import collectionService from './collection.service';
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

  // those should be in user-navigation.service.ts or something about temp state

  public getCurrentFolder() {
    return (
      (storageService
        .getStore()
        .getCell(this.spacesTable, storageService.getSpaceId(), 'currentFolder')
        ?.valueOf() as string) || DEFAULT_NOTEBOOK_ID
    );
  }

  public useCurrentFolder() {
    return (
      useCellWithRef<string>(
        this.storeId,
        this.spacesTable,
        storageService.getSpaceId(),
        'currentFolder'
      ) || DEFAULT_NOTEBOOK_ID
    );
  }

  public setCurrentFolder(folder: string) {
    storageService.getStore().transaction(() => {
      storageService
        .getStore()
        .setCell(
          this.spacesTable,
          storageService.getSpaceId(),
          'currentFolder',
          folder
        );
      const breadcrumb = collectionService.getBreadcrumb(folder);
      storageService
        .getStore()
        .setCell(
          this.spacesTable,
          storageService.getSpaceId(),
          'currentNotebook',
          breadcrumb[0]
        );
    });
  }

  public getCurrentDocument() {
    return (
      (storageService
        .getStore()
        .getCell(
          this.spacesTable,
          storageService.getSpaceId(),
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

  public getCurrentPage() {
    return (
      (storageService
        .getStore()
        .getCell(this.spacesTable, storageService.getSpaceId(), 'currentPage')
        ?.valueOf() as string) || undefined
    );
  }

  public setCurrentPage(page?: string) {
    if (page) {
      storageService
        .getStore()
        .setCell(
          this.spacesTable,
          storageService.getSpaceId(),
          'currentPage',
          page
        );
    } else {
      storageService
        .getStore()
        .delCell(this.spacesTable, storageService.getSpaceId(), 'currentPage');
    }
  }
}

const userSettingsService = new UserSettingsService();
export default userSettingsService;
