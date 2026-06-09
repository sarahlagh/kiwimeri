import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import { store } from '@/core/db/store';
import { useValueWithRef } from './tinybase/hooks';

export type Theme = 'light' | 'dark';

class UserSettingsService {
  private readonly storeId = 'store';

  public useTheme() {
    return useValueWithRef(this.storeId, 'theme') as Theme;
  }

  public setTheme(theme: Theme) {
    store.setValue('theme', theme);
  }

  public getExportIncludeMetadata() {
    const val = store.getValue('exportIncludeMetadata')?.valueOf();
    if (val === undefined) return true;
    return val;
  }

  public useExportIncludeMetadata(): boolean {
    return useValueWithRef(this.storeId, 'exportIncludeMetadata') || true;
  }

  public setExportIncludeMetadata(value: boolean) {
    store.setValue('exportIncludeMetadata', value);
  }

  public useShowDevTools(): boolean {
    return (
      useValueWithRef(this.storeId, 'showDevTools') ||
      !platformService.isRelease()
    );
  }

  public setShowDevTools(value: boolean) {
    store.setValue('showDevTools', value);
  }

  /** @deprecated */
  public getInternalProxy() {
    const val = store.getValue('internalProxy')?.valueOf();
    return val !== undefined ? val : appConfig.INTERNAL_HTTP_PROXY;
  }

  public getResumeLastSelection(): boolean {
    return store.getValue('resumeLastSelection').valueOf();
  }

  public useResumeLastSelection() {
    return useValueWithRef(this.storeId, 'resumeLastSelection') as boolean;
  }

  public setResumeLastSelection(value: boolean) {
    store.setValue('resumeLastSelection', value);
  }
}

/** @deprecated */
const userSettingsService = new UserSettingsService();
export default userSettingsService;
