import {
  CollectionItemDisplayOpts,
  CollectionItemFlags,
  CollectionItemSortType,
  defaultFlags
} from '@/collection/collection';
import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import { DEFAULT_SPACE_ID } from '@/constants';
import { space, store } from '@/core/db/store';
import { SpaceValue, SpaceValues } from '@/core/db/store-schema';
import { useSpaceValue } from '@/core/db/tinybase-hooks';
import localChangesService from '@/domain/local-changes/local-changes.service';
import collectionService from './collection.service';
import notebooksService from './notebooks.service';
import { useValueWithRef } from './tinybase/hooks';

export type Theme = 'light' | 'dark';

class UserSettingsService {
  private readonly storeId = 'store';
  private readonly spaceId = 'space';

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

  /////////////////////////

  // here, options that are synchronized with collection

  public getSpaceDefaultDisplayOpts(
    spaceId?: string
  ): CollectionItemDisplayOpts {
    if (!spaceId) {
      spaceId = DEFAULT_SPACE_ID;
    }
    const by = space.getValue('defaultSortBy') as CollectionItemSortType;
    const descending = space.getValue('defaultSortDesc').valueOf();
    return {
      sort: {
        by,
        descending
      }
    };
  }

  public getSpaceDefaultFlags(): Required<CollectionItemFlags> {
    let statsEnabled = space.getValue<'statsEnabled'>('statsEnabled');
    if (statsEnabled === undefined) {
      statsEnabled = defaultFlags.statsEnabled;
    }
    return {
      statsEnabled
    };
  }

  public useSpaceDefaultFlags(): Required<CollectionItemFlags> {
    let statsEnabled = useSpaceValue<'statsEnabled'>('statsEnabled', 'space');
    if (statsEnabled === undefined) {
      statsEnabled = defaultFlags.statsEnabled;
    }
    return {
      statsEnabled
    };
  }

  public useSpaceDefaultDisplayOpts(space?: string): CollectionItemDisplayOpts {
    if (!space) {
      space = DEFAULT_SPACE_ID;
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
    if (newDisplayOpts.sort.by === 'order')
      newDisplayOpts.sort.descending = false;
    this.setSyncableValues({
      defaultSortBy: newDisplayOpts.sort.by,
      defaultSortDesc: newDisplayOpts.sort.descending
    });
  }

  public setSpaceDefaultFlags(newFlags: CollectionItemFlags) {
    this.setSyncableValues(newFlags);
  }

  private setSyncableValues(values: Partial<SpaceValues>) {
    space.transaction(() => {
      localChangesService.addValueLocalChange();
      space.setValue('valuesLastUpdatedAt', Date.now());

      const names = Object.keys(values) as SpaceValue[];
      names.forEach(name => {
        if (values[name] !== undefined) {
          space.setValue(name, values[name]);
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

  public useDefaultFlags(notebook?: string): Required<CollectionItemFlags> {
    const currentNotebook = notebooksService.useCurrentNotebook();
    if (!notebook) {
      notebook = currentNotebook;
    }
    const notebookDisplayOpts = collectionService.useItemFlags(notebook);
    if (notebookDisplayOpts) {
      return { ...defaultFlags, ...notebookDisplayOpts };
    }
    return this.getSpaceDefaultFlags();
  }

  public getDefaultFlags(notebook?: string): Required<CollectionItemFlags> {
    if (!notebook) {
      notebook = notebooksService.getCurrentNotebook();
    }
    const notebookDisplayOpts = collectionService.getItemFlags(notebook);
    if (notebookDisplayOpts) {
      return { ...defaultFlags, ...notebookDisplayOpts };
    }
    return this.getSpaceDefaultFlags();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getHistoryIdleTime(spaceId?: string): number {
    return space.getValue('historyIdleTime').valueOf();
  }

  public useHistoryIdleTime(): number {
    return useValueWithRef(this.spaceId, 'historyIdleTime') as number;
  }

  public setHistoryIdleTime(value: number) {
    this.setSyncableValues({
      historyIdleTime: value
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getHistoryMaxInterval(spaceId?: string): number {
    return space.getValue('historyMaxInterval').valueOf();
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getHistoryMaxVersions(spaceId?: string): number {
    return space.getValue('maxHistoryPerDoc').valueOf();
  }

  public setHistoryMaxVersions(value: number) {
    this.setSyncableValues({
      maxHistoryPerDoc: value
    });
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

const userSettingsService = new UserSettingsService();
export default userSettingsService;
