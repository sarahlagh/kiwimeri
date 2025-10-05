import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import storageService from './storage.service';
import { useValueWithRef } from './tinybase/hooks';

class UserSettingsService {
  private readonly storeId = 'store';

  public useTheme() {
    return useValueWithRef(this.storeId, 'theme');
  }

  public setTheme(theme: 'light' | 'dark') {
    storageService.getStore().setValue('theme', theme);
  }

  public getExportIncludeMetadata() {
    const val = storageService
      .getStore()
      .getValue('exportIncludeMetadata')
      ?.valueOf();
    if (val === undefined) return true;
    return val;
  }

  public useExportIncludeMetadata(): boolean {
    return useValueWithRef(this.storeId, 'exportIncludeMetadata') || true;
  }

  public setExportIncludeMetadata(value: boolean) {
    storageService.getStore().setValue('exportIncludeMetadata', value);
  }

  public getExportInlinePages() {
    const val = storageService
      .getStore()
      .getValue('exportInlinePages')
      ?.valueOf();
    if (val === undefined) return false;
    return val;
  }

  public useExportInlinePages(): boolean {
    return useValueWithRef(this.storeId, 'exportInlinePages') || false;
  }

  public setExportInlinePages(value: boolean) {
    storageService.getStore().setValue('exportInlinePages', value);
  }

  public useShowDevTools(): boolean {
    return (
      useValueWithRef(this.storeId, 'showDevTools') ||
      !platformService.isRelease()
    );
  }

  public setShowDevTools(value: boolean) {
    storageService.getStore().setValue('showDevTools', value);
  }

  public getInternalProxy() {
    return (
      storageService.getStore().getValue('internalProxy')?.valueOf() ||
      appConfig.INTERNAL_HTTP_PROXY
    );
  }
}

const userSettingsService = new UserSettingsService();
export default userSettingsService;
