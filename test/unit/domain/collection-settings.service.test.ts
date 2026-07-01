import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space } from '@/core/db/store';
import { MetaField } from '@/core/db/types';
import { settingsService } from '@/domain/collection/collection-settings.service';
import collectionService from '@/domain/collection/collection.service';
import notebooksService from '@/domain/collection/notebooks.service';
import useFolderEffectiveSort from '@/features/collection-browser/hooks/useFolderEffectiveSort';
import useNotebookLastBrowserMode from '@/features/collection-browser/hooks/useNotebookLastBrowserMode';
import useNotebookDefaultSettings from '@/shared/hooks/useNotebookDefaultSettings';
import useSpaceDefaultSettings from '@/shared/hooks/useSpaceDefaultSettings';
import { adv, fakeTimersDelay, wrappedRenderHook } from '@@/_setup/test.utils';
import { describe, expect, it } from 'vitest';

describe('settings service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // TODO actually merge into one method
  it.skip('should override space settings per folder', () => {
    const currentNotebook = notebooksService.getCurrentNotebook();
    const folderId = collectionService.addFolder(currentNotebook);

    settingsService.setSpaceDefaultSort({
      by: 'updatedAt',
      descending: true
    });

    settingsService.setNotebookDefaultSort(currentNotebook, {
      by: 'order',
      descending: false
    });

    settingsService.setFolderSort(folderId, {
      by: 'title',
      descending: false
    });

    const defaultSort = settingsService.getNotebookDefaultSort();
    const folderOpts = settingsService.getFolderSettings(folderId)?.sort;
    expect(defaultSort).toEqual({
      by: 'order',
      descending: false
    });

    expect(folderOpts).toEqual({
      sort: {
        by: 'title',
        descending: false
      }
    });
  });

  it('should override space settings sort per notebook', () => {
    const currentNotebook = notebooksService.getCurrentNotebook();
    settingsService.setSpaceDefaultSort({
      by: 'updatedAt',
      descending: true
    });

    settingsService.setNotebookDefaultSort(currentNotebook, {
      by: 'order',
      descending: false
    });

    const defaultSort = settingsService.getNotebookDefaultSort();
    expect(defaultSort).toEqual({
      by: 'order',
      descending: false
    });
  });

  it('should use space settings sort as fallback', () => {
    const currentNotebook = notebooksService.getCurrentNotebook();
    settingsService.setSpaceDefaultSort({
      by: 'updatedAt',
      descending: true
    });
    settingsService.setNotebookDefaultSort(currentNotebook, {
      by: 'order',
      descending: false
    });

    const defaultSort = settingsService.getNotebookDefaultSort('another');
    expect(defaultSort).toEqual({
      by: 'updatedAt',
      descending: true
    });
  });

  it('should override space settings statsEnabled per notebook', () => {
    settingsService.setSpaceDefaultStatsEnabled(true);
    settingsService.setNotebookSettings(DEFAULT_NOTEBOOK_ID, {
      statsEnabled: false
    });

    const defaultStatsEnabled =
      settingsService.getNotebookDefaultStatsEnabled();
    expect(defaultStatsEnabled).toEqual(false);
  });

  it('should use space settings statsEnabled as fallback 1', () => {
    settingsService.setSpaceDefaultStatsEnabled(true);
    settingsService.setNotebookDefaultSort(DEFAULT_NOTEBOOK_ID, {
      // no stats enabled here
      by: 'order',
      descending: false
    });

    const defaultStatsEnabled =
      settingsService.getNotebookDefaultStatsEnabled();
    expect(defaultStatsEnabled).toEqual(true);
  });

  it('should use space settings statsEnabled as fallback 2', () => {
    settingsService.setSpaceDefaultStatsEnabled(true);

    const defaultStatsEnabled =
      settingsService.getNotebookDefaultStatsEnabled();
    expect(defaultStatsEnabled).toEqual(true);
  });

  it('should merge value when updating notebook settings', () => {
    const now = Date.now();
    adv(() =>
      settingsService.setNotebookDefaultBrowserMode(DEFAULT_NOTEBOOK_ID, 0)
    );
    adv(() =>
      settingsService.setNotebookDefaultSort(DEFAULT_NOTEBOOK_ID, {
        by: 'createdAt',
        descending: false
      })
    );
    const settings = space.getCell(
      'collection',
      DEFAULT_NOTEBOOK_ID,
      'settings'
    );
    const settings_meta = space.getCell(
      'collection',
      DEFAULT_NOTEBOOK_ID,
      'settings_meta'
    ) as MetaField;
    expect(settings).toEqual({
      browserMode: 0,
      sort: {
        by: 'createdAt',
        descending: false
      }
    });
    expect(settings_meta._u).toBe(now + 3 * fakeTimersDelay);
  });

  it('should merge value when updating folder settings', () => {
    const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
    space.setCell('collection', fId, 'settings', { test: true });

    const now = Date.now();
    adv(() =>
      settingsService.setFolderSort(fId, {
        by: 'createdAt',
        descending: false
      })
    );
    const settings = space.getCell('collection', fId, 'settings');
    const settings_meta = space.getCell(
      'collection',
      fId,
      'settings_meta'
    ) as MetaField;
    expect(settings).toEqual({
      test: true,
      sort: {
        by: 'createdAt',
        descending: false
      }
    });
    expect(settings_meta._u).toBe(now + fakeTimersDelay);
  });

  it('should merge value when updating document settings', () => {
    const dId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    space.setCell('collection', dId, 'settings', { test: true });

    const now = Date.now();
    adv(() =>
      settingsService.setDocumentSort(dId, {
        by: 'createdAt',
        descending: false
      })
    );
    const settings = space.getCell('collection', dId, 'settings');
    const settings_meta = space.getCell(
      'collection',
      dId,
      'settings_meta'
    ) as MetaField;
    expect(settings).toEqual({
      test: true,
      documentSort: {
        by: 'createdAt',
        descending: false
      }
    });
    expect(settings_meta._u).toBe(now + fakeTimersDelay);
  });
});

describe('settings hooks', () => {
  it('[useSpaceDefaultSettings] should return space defaults even when not set', () => {
    {
      const { result, unmount } = wrappedRenderHook(() =>
        useSpaceDefaultSettings()
      );
      expect(result.current).toEqual({
        sort: {
          by: 'createdAt',
          descending: false
        },
        statsEnabled: false
      });
      unmount();
    }
  });

  it('[useSpaceDefaultSettings] should return space defaults even when partially set', () => {
    settingsService.setSpaceDefaultStatsEnabled(true);
    {
      const { result, unmount } = wrappedRenderHook(() =>
        useSpaceDefaultSettings()
      );
      expect(result.current).toEqual({
        sort: {
          by: 'createdAt',
          descending: false
        },
        statsEnabled: true
      });
      unmount();
    }
  });

  it('[useSpaceDefaultSettings] should return space defaults when set', () => {
    settingsService.setSpaceDefaultStatsEnabled(true);
    settingsService.setSpaceDefaultSort({ by: 'order', descending: true });
    {
      const { result, unmount } = wrappedRenderHook(() =>
        useSpaceDefaultSettings()
      );
      expect(result.current).toEqual({
        sort: {
          by: 'order',
          descending: false
        },
        statsEnabled: true
      });
      unmount();
    }
  });

  it('[useNotebookDefaultSettings] should return space defaults when not set', () => {
    {
      const { result, unmount } = wrappedRenderHook(() =>
        useNotebookDefaultSettings()
      );
      expect(result.current).toEqual({
        sort: {
          by: 'createdAt',
          descending: false
        },
        statsEnabled: false
      });
      unmount();
    }
  });

  it('[useNotebookDefaultSettings] should return space defaults + own when partially set 1', () => {
    settingsService.setNotebookDefaultBrowserMode(DEFAULT_NOTEBOOK_ID, 0);
    {
      const { result, unmount } = wrappedRenderHook(() =>
        useNotebookDefaultSettings()
      );
      expect(result.current).toEqual({
        sort: {
          by: 'createdAt',
          descending: false
        },
        statsEnabled: false,
        browserMode: 0
      });
      unmount();
    }
  });

  it('[useNotebookDefaultSettings] should return space defaults + own when partially set 2', () => {
    settingsService.setNotebookDefaultBrowserMode(DEFAULT_NOTEBOOK_ID, 0);
    settingsService.setNotebookDefaultSort(DEFAULT_NOTEBOOK_ID, {
      by: 'title',
      descending: true
    });
    {
      const { result, unmount } = wrappedRenderHook(() =>
        useNotebookDefaultSettings()
      );
      expect(result.current).toEqual({
        sort: {
          by: 'title',
          descending: true
        },
        statsEnabled: false,
        browserMode: 0
      });
      unmount();
    }
  });

  it('[useNotebookDefaultSettings] should return space defaults + own when partially set 3', () => {
    settingsService.setNotebookSettings(DEFAULT_NOTEBOOK_ID, {
      statsEnabled: true
    });
    {
      const { result, unmount } = wrappedRenderHook(() =>
        useNotebookDefaultSettings()
      );
      expect(result.current).toEqual({
        sort: {
          by: 'createdAt',
          descending: false
        },
        statsEnabled: true
      });
      unmount();
    }
  });

  it('[useNotebookDefaultSettings] should return own when set', () => {
    settingsService.setNotebookSettings(DEFAULT_NOTEBOOK_ID, {
      statsEnabled: true,
      sort: {
        by: 'title',
        descending: true
      }
    });
    {
      const { result, unmount } = wrappedRenderHook(() =>
        useNotebookDefaultSettings()
      );
      expect(result.current).toEqual({
        sort: {
          by: 'title',
          descending: true
        },
        statsEnabled: true
      });
      unmount();
    }
  });

  it('[useNotebookLastBrowserMode] should return 0 when not set 1', () => {
    settingsService.setNotebookSettings(DEFAULT_NOTEBOOK_ID, {
      statsEnabled: true,
      sort: {
        by: 'title',
        descending: true
      }
    });
    {
      const { result, unmount } = wrappedRenderHook(() =>
        useNotebookLastBrowserMode()
      );
      expect(result.current).toEqual(0);
      unmount();
    }
  });

  it('[useNotebookLastBrowserMode] should return 0 when not set 2', () => {
    {
      const { result, unmount } = wrappedRenderHook(() =>
        useNotebookLastBrowserMode()
      );
      expect(result.current).toEqual(0);
      unmount();
    }
  });

  it('[useNotebookLastBrowserMode] should return value when set', () => {
    settingsService.setNotebookSettings(DEFAULT_NOTEBOOK_ID, {
      statsEnabled: true,
      sort: {
        by: 'title',
        descending: true
      }
    });
    settingsService.setNotebookDefaultBrowserMode(DEFAULT_NOTEBOOK_ID, 2);
    {
      const { result, unmount } = wrappedRenderHook(() =>
        useNotebookLastBrowserMode()
      );
      expect(result.current).toEqual(2);
      unmount();
    }
  });

  it('[useFolderEffectiveSort] should return notebook value when not set', () => {
    const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
    {
      const { result, unmount } = wrappedRenderHook(() =>
        useFolderEffectiveSort(fId)
      );
      expect(result.current).toEqual({
        by: 'createdAt',
        descending: false
      });
      unmount();
    }
  });

  it('[useFolderEffectiveSort] should return own value when set', () => {
    const fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
    settingsService.setFolderSort(fId, {
      by: 'title',
      descending: true
    });
    {
      const { result, unmount } = wrappedRenderHook(() =>
        useFolderEffectiveSort(fId)
      );
      expect(result.current).toEqual({
        by: 'title',
        descending: true
      });
      unmount();
    }
  });
});
