import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { displayOptsService } from '@/domain/collection-display-opts/display-opts.service';
import { describe, expect, it } from 'vitest';

describe('display opts service', () => {
  // TODO actually merge into one method
  it.skip('should override space display opts per folder', () => {
    const currentNotebook = notebooksService.getCurrentNotebook();
    const folderId = collectionService.addFolder(currentNotebook);

    displayOptsService.setSpaceDefaultSort({
      by: 'updated',
      descending: true
    });

    displayOptsService.setNotebookDefaultSort(currentNotebook, {
      by: 'order',
      descending: false
    });

    displayOptsService.setFolderSort(folderId, {
      by: 'title',
      descending: false
    });

    const defaultSort = displayOptsService.getNotebookDefaultSort();
    const folderOpts = displayOptsService.getFolderDisplayOpts(folderId);
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

  it('should override space display opts per notebook', () => {
    const currentNotebook = notebooksService.getCurrentNotebook();
    displayOptsService.setSpaceDefaultSort({
      by: 'updated',
      descending: true
    });

    displayOptsService.setNotebookDefaultSort(currentNotebook, {
      by: 'order',
      descending: false
    });

    const defaultSort = displayOptsService.getNotebookDefaultSort();
    expect(defaultSort).toEqual({
      by: 'order',
      descending: false
    });
  });

  it('should use space display opts as fallback', () => {
    const currentNotebook = notebooksService.getCurrentNotebook();
    displayOptsService.setSpaceDefaultSort({
      by: 'updated',
      descending: true
    });
    displayOptsService.setNotebookDefaultSort(currentNotebook, {
      by: 'order',
      descending: false
    });

    const defaultSort = displayOptsService.getNotebookDefaultSort('another');
    expect(defaultSort).toEqual({
      by: 'updated',
      descending: true
    });
  });
});
