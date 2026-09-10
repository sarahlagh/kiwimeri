import { appConfig } from '@/config';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { getNativePersisters, space, store } from '@/core/db/store';
import { SpaceTables, StoreTables } from '@/core/db/store-constants';
import { startDbListeners, stopDbListeners } from '@/core/db/store-listeners';
import { plt } from '@/core/infra/platform';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';
import collectionService from '@/domain/collection/collection.service';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import notebooksService from '@/domain/collection/notebooks.service';
import { writer } from '@/domain/document-edits/document-edits.service';
import { historyService } from '@/domain/history/history.service';
import { profileService } from '@/domain/profiles/profile.service';
import remotesService from '@/domain/synchronization/remotes.service';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';
import { getNewParsedContent, nukeStorage } from '@@/_setup/test.utils';
import { Content } from 'tinybase';

declare global {
  interface Window {
    contentMap: Map<string, Content>;
  }
}

function hasTaskByName(name: string) {
  const table = space.getTable(SpaceTables.Tasks);
  for (const rowId of space.getRowIds(SpaceTables.Tasks)) {
    if (table[rowId].name === name) {
      return true;
    }
  }
  return false;
}

describe('native db persister test', () => {
  beforeEach(() => {
    stopDbListeners();
    appConfig.NATIVE_SAVE_THROTTLE = 100;
    appConfig.SCHEDULER_INTERVAL = 50;
    space.delTable(SpaceTables.Tasks);
    notebooksService.initNotebooks();
    startDbListeners();
    vi.useFakeTimers();
    schedule['initRecurringTasks'] = function () {}; // don't define log gc & history gc
    schedule.start();
  });
  afterEach(() => {
    stopDbListeners();
    window.contentMap.clear();
    schedule.stop();
    historyService['enabled'] = false;
    nukeStorage();
    vi.useRealTimers();
  });

  test('mock works', () => {
    expect(plt.hasNativeSupport()).toBe(true);
    expect(getNativePersisters().nativeStorePersister).not.toBeNull();
  });

  describe('what triggers a native backup', () => {
    test('editing the collection triggers a native backup', () => {
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);
      expect(window.contentMap.size).toBe(0);

      collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(true);

      vi.advanceTimersByTime(200);
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);

      expect(window.contentMap.size).toBe(2);
      expect(window.contentMap.has('kiwimeri-space-default')).toBe(true);
      expect(
        window.contentMap.has('kiwimeri-space-document-content-default')
      ).toBe(true);
    });

    test('editing the document content triggers a native backup', () => {
      // edit document (cheating with notebook to avoid having to create a doc beforehand)
      collectionService.setItemLexicalContent(
        DEFAULT_NOTEBOOK_ID,
        getNewParsedContent('test'),
        true // skip version
      );
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(true);

      vi.advanceTimersByTime(200);
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);

      expect(window.contentMap.size).toBe(2);
      expect(window.contentMap.has('kiwimeri-space-default')).toBe(true);
      expect(
        window.contentMap.has('kiwimeri-space-document-content-default')
      ).toBe(true);
    });

    test('editing the annotation content triggers a native backup', () => {
      // edit annot
      annotsService.edit('test', getNewParsedContent('test'));
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(true);

      vi.advanceTimersByTime(200);
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);

      expect(window.contentMap.size).toBe(2);
      expect(window.contentMap.has('kiwimeri-space-default')).toBe(true);
      expect(
        window.contentMap.has('kiwimeri-space-document-content-default')
      ).toBe(true);
    });

    test('editing the document content with fastWrite triggers a native backup', () => {
      // edit document
      writer.fastWrite('collection', 'test', {} as any, [{} as any], false);
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(true);

      vi.advanceTimersByTime(200);
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);

      expect(window.contentMap.size).toBe(1);
      expect(window.contentMap.has('kiwimeri-space-default')).toBe(true);
    });

    test('editing the history triggers a native backup', () => {
      historyService['enabled'] = true;
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);
      expect(window.contentMap.size).toBe(0);

      collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(true);

      vi.advanceTimersByTime(200);
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);

      expect(window.contentMap.size).toBe(3);
      expect(window.contentMap.has('kiwimeri-space-default')).toBe(true);
      expect(
        window.contentMap.has('kiwimeri-space-document-content-default')
      ).toBe(true);
      expect(window.contentMap.has('kiwimeri-space-archive-default')).toBe(
        true
      );
    });

    test('editing a user pref triggers a native backup', () => {
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);
      expect(window.contentMap.size).toBe(0);

      userPrefs.set('statsEnabled', !userPrefs.getDefault('statsEnabled'));
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(true);

      vi.advanceTimersByTime(200);
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);

      expect(window.contentMap.size).toBe(1);
      expect(window.contentMap.has('kiwimeri-space-default')).toBe(true);
    });

    test('editing a remote triggers a native backup', () => {
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);
      expect(window.contentMap.size).toBe(0);

      remotesService.addRemote('pcloud', 0, 'pcloud');
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(true);

      vi.advanceTimersByTime(200);
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);

      expect(window.contentMap.size).toBe(1);
      expect(window.contentMap.has('kiwimeri-space-default')).toBe(true);
    });

    test('adding a profile triggers a native backup', () => {
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);
      expect(window.contentMap.size).toBe(0);

      profileService.createProfile('test');
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(true);

      vi.advanceTimersByTime(200);
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);

      expect(window.contentMap.size).toBe(1);
      expect(window.contentMap.has('kiwimeri-store')).toBe(true);
    });

    test('other edits do not trigger a native backup', () => {
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);
      expect(window.contentMap.size).toBe(0);

      schedule.in(10, TaskNames.DELETE_NATIVE_BACKUPS); // add task
      store.addRow(StoreTables.Logs, {
        level: 'd',
        message: 'test',
        ts: Date.now()
      }); // add log
      expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);
      expect(window.contentMap.size).toBe(0);
    });
  });

  test('a store native backup does not include logs', () => {
    store.addRow(StoreTables.Logs, {
      level: 'd',
      message: 'test',
      ts: Date.now()
    }); // add log
    profileService.createProfile('test');
    expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(true);
    vi.advanceTimersByTime(200);
    expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(false);

    expect(window.contentMap.size).toBe(1);
    expect(window.contentMap.has('kiwimeri-store'));
    expect(window.contentMap.get('kiwimeri-store')![0].profiles).toBeDefined();
    expect(window.contentMap.get('kiwimeri-store')![0].logs).toBeUndefined();
  });

  test('deleting a profile creates a delete backup task', () => {
    profileService.createProfile('new');
    expect(hasTaskByName(TaskNames.NATIVE_STORE_SAVE)).toBe(true);
    profileService.deleteProfile('new');
    expect(hasTaskByName(TaskNames.DELETE_NATIVE_BACKUPS)).toBe(true);
  });

  test('deleting a profile then recreating it cancels the delete backup task', () => {
    profileService.createProfile('new');
    vi.advanceTimersByTime(10);
    profileService.deleteProfile('new');
    expect(hasTaskByName(TaskNames.DELETE_NATIVE_BACKUPS)).toBe(true);
    vi.advanceTimersByTime(10);
    // recreate it
    profileService.createProfile('new');
    expect(hasTaskByName(TaskNames.DELETE_NATIVE_BACKUPS)).toBe(false);
  });
});
