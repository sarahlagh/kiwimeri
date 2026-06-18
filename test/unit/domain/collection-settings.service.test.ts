import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { settingsService } from '@/domain/collection-settings/collection-settings.service';
import { describe, expect, it } from 'vitest';

describe('settings service', () => {
  // TODO actually merge into one method
  it.skip('should override space settings per folder', () => {
    const currentNotebook = notebooksService.getCurrentNotebook();
    const folderId = collectionService.addFolder(currentNotebook);

    settingsService.setSpaceDefaultSort({
      by: 'updated',
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

  it('should override space settings per notebook', () => {
    const currentNotebook = notebooksService.getCurrentNotebook();
    settingsService.setSpaceDefaultSort({
      by: 'updated',
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

  it('should use space settings as fallback', () => {
    const currentNotebook = notebooksService.getCurrentNotebook();
    settingsService.setSpaceDefaultSort({
      by: 'updated',
      descending: true
    });
    settingsService.setNotebookDefaultSort(currentNotebook, {
      by: 'order',
      descending: false
    });

    const defaultSort = settingsService.getNotebookDefaultSort('another');
    expect(defaultSort).toEqual({
      by: 'updated',
      descending: true
    });
  });
});
