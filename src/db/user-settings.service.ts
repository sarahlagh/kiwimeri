import {
  CollectionItemDisplayOpts,
  CollectionItemSort
} from '@/collection/collection';
import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import collectionService from './collection.service';
import notebooksService from './notebooks.service';
import storageService from './storage.service';
import { useValueWithRef } from './tinybase/hooks';

export const defaultSort: CollectionItemSort = {
  by: 'created',
  descending: false
} as const;

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
    const val = storageService.getStore().getValue('internalProxy')?.valueOf();
    return val !== undefined ? val : appConfig.INTERNAL_HTTP_PROXY;
  }

  /////////////////////////

  // here, options that are synchronized with collection

  public useDefaultDisplayOpts(notebook?: string): CollectionItemDisplayOpts {
    const currentNotebook = notebooksService.useCurrentNotebook();
    if (!notebook) {
      notebook = currentNotebook;
    }
    const notebookDisplayOpts = collectionService.useItemDisplayOpts(notebook);
    if (notebookDisplayOpts) {
      return notebookDisplayOpts!;
    }
    return { sort: defaultSort };
  }
}

const userSettingsService = new UserSettingsService();
export default userSettingsService;
