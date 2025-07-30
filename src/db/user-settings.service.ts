import storageService from './storage.service';
import { useValueWithRef } from './tinybase/hooks';

class UserSettingsService {
  private readonly storeId = 'store';
  private readonly spacesTable = 'spaces';

  public useTheme() {
    return useValueWithRef(this.storeId, 'theme');
  }

  public setTheme(theme: 'light' | 'dark') {
    storageService.getStore().setValue('theme', theme);
  }

  public getExportIncludeMetadata() {
    return (
      storageService.getStore().getValue('exportIncludeMetadata')?.valueOf() ||
      true
    );
  }

  public setExportIncludeMetadata(value: boolean) {
    storageService.getStore().setValue('exportIncludeMetadata', value);
  }

  public getExportInlinePages() {
    return (
      storageService.getStore().getValue('exportInlinePages')?.valueOf() ||
      false
    );
  }

  public setExportInlinePages(value: boolean) {
    storageService.getStore().setValue('exportInlinePages', value);
  }
}

const userSettingsService = new UserSettingsService();
export default userSettingsService;
