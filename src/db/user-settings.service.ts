import {
  CollectionItemDisplayOpts,
  CollectionItemSortType
} from '@/collection/collection';
import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import collectionService from './collection.service';
import localChangesService from './local-changes.service';
import notebooksService from './notebooks.service';
import storageService from './storage.service';
import { useValueWithRef } from './tinybase/hooks';
import { LocalChangeType } from './types/store-types';

class UserSettingsService {
  private readonly storeId = 'store';
  private readonly spaceId = 'space';

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

  public getSpaceDefaultDisplayOpts(space?: string): CollectionItemDisplayOpts {
    if (!space) {
      space = storageService.getSpaceId();
    }
    const by = storageService
      .getSpace()
      .getValue('defaultSortBy') as CollectionItemSortType;
    const descending = storageService
      .getSpace()
      .getValue('defaultSortDesc')
      .valueOf();
    return {
      sort: {
        by,
        descending
      }
    };
  }

  public useSpaceDefaultDisplayOpts(space?: string): CollectionItemDisplayOpts {
    if (!space) {
      space = storageService.getSpaceId();
    }
    const by = useValueWithRef(
      this.spaceId,
      'defaultSortBy'
    ) as CollectionItemSortType;
    const descending = useValueWithRef(
      this.spaceId,
      'defaultSortDesc'
    ) as boolean;
    return {
      sort: {
        by,
        descending
      }
    };
  }

  public setSpaceDefaultDisplayOpts(newDisplayOpts: CollectionItemDisplayOpts) {
    storageService.getSpace().transaction(() => {
      localChangesService.addLocalChange('', LocalChangeType.value);
      storageService.getSpace().setValue('lastUpdated', Date.now());
      storageService
        .getSpace()
        .setValue('defaultSortBy', newDisplayOpts.sort.by);
      storageService
        .getSpace()
        .setValue('defaultSortDesc', newDisplayOpts.sort.descending);
    });
  }

  public useDefaultDisplayOpts(
    notebook?: string,
    space?: string
  ): CollectionItemDisplayOpts {
    const currentNotebook = notebooksService.useCurrentNotebook();
    if (!notebook) {
      notebook = currentNotebook;
    }
    const notebookDisplayOpts = collectionService.useItemDisplayOpts(notebook);
    if (notebookDisplayOpts) {
      return notebookDisplayOpts!;
    }
    return this.getSpaceDefaultDisplayOpts(space);
  }

  public getDefaultDisplayOpts(
    notebook?: string,
    space?: string
  ): CollectionItemDisplayOpts {
    if (!notebook) {
      notebook = notebooksService.getCurrentNotebook();
    }
    const notebookDisplayOpts = collectionService.getItemDisplayOpts(notebook);
    if (notebookDisplayOpts) {
      return notebookDisplayOpts!;
    }
    return this.getSpaceDefaultDisplayOpts(space);
  }
}

const userSettingsService = new UserSettingsService();
export default userSettingsService;
