import {
  CollectionItemDisplayOpts,
  CollectionItemSortType
} from '@/collection/collection';
import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import localChangesService from '@/domain/local-changes/local-changes.service';
import collectionService from './collection.service';
import notebooksService from './notebooks.service';
import storageService from './storage.service';
import { useValueWithRef } from './tinybase/hooks';
import { SpaceValue, SpaceValues } from './types/space-types';

export type Theme = 'light' | 'dark';

class UserSettingsService {
  private readonly storeId = 'store';
  private readonly spaceId = 'space';

  public useTheme() {
    return useValueWithRef(this.storeId, 'theme') as Theme;
  }

  public setTheme(theme: Theme) {
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
    const statsEnabled = storageService
      .getSpace()
      .getValue('statsEnabled')
      .valueOf();
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
      },
      statsEnabled
    };
  }

  public useSpaceDefaultDisplayOpts(space?: string): CollectionItemDisplayOpts {
    if (!space) {
      space = storageService.getSpaceId();
    }
    const statsEnabled = useValueWithRef(
      this.spaceId,
      'statsEnabled'
    ) as boolean;
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
      },
      statsEnabled
    };
  }

  public setSpaceDefaultDisplayOpts(newDisplayOpts: CollectionItemDisplayOpts) {
    if (newDisplayOpts.sort.by === 'order')
      newDisplayOpts.sort.descending = false;
    this.setSyncableValues({
      defaultSortBy: newDisplayOpts.sort.by,
      defaultSortDesc: newDisplayOpts.sort.descending,
      statsEnabled: newDisplayOpts.statsEnabled
    });
  }

  private setSyncableValues(values: Partial<SpaceValues>) {
    storageService.getSpace().transaction(() => {
      localChangesService.addLocalChange('values');
      storageService.getSpace().setValue('lastUpdated', Date.now());

      const names = Object.keys(values) as SpaceValue[];
      names.forEach(name => {
        if (values[name]) {
          storageService.getSpace().setValue(name, values[name]);
        }
      });
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

  public getHistoryIdleTime(space?: string): number {
    return storageService.getSpace(space).getValue('historyIdleTime').valueOf();
  }

  public useHistoryIdleTime(): number {
    return useValueWithRef(this.spaceId, 'historyIdleTime') as number;
  }

  public setHistoryIdleTime(value: number) {
    this.setSyncableValues({
      historyIdleTime: value
    });
  }

  public getHistoryMaxInterval(space?: string): number {
    return storageService
      .getSpace(space)
      .getValue('historyMaxInterval')
      .valueOf();
  }

  public useHistoryMaxInterval(): number {
    return useValueWithRef(this.spaceId, 'historyMaxInterval') as number;
  }

  public setHistoryMaxInterval(value: number) {
    this.setSyncableValues({
      historyMaxInterval: value
    });
  }

  public useHistoryMaxVersions(): number {
    return useValueWithRef(this.spaceId, 'maxHistoryPerDoc') as number;
  }

  public getHistoryMaxVersions(space?: string): number {
    return storageService
      .getSpace(space)
      .getValue('maxHistoryPerDoc')
      .valueOf();
  }

  public setHistoryMaxVersions(value: number) {
    this.setSyncableValues({
      maxHistoryPerDoc: value
    });
  }

  public getResumeLastSelection(): boolean {
    return storageService.getStore().getValue('resumeLastSelection').valueOf();
  }

  public useResumeLastSelection() {
    return useValueWithRef(this.storeId, 'resumeLastSelection') as boolean;
  }

  public setResumeLastSelection(value: boolean) {
    storageService.getStore().setValue('resumeLastSelection', value);
  }
}

const userSettingsService = new UserSettingsService();
export default userSettingsService;
