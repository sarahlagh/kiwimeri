import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import userSettingsService from '@/db/user-settings.service';
import { it } from 'vitest';

describe('user settings service', () => {
  // TODO actually merge into one method
  it.skip('should override space display opts per folder', () => {
    const currentNotebook = notebooksService.getCurrentNotebook();
    const folderId = collectionService.addFolder(currentNotebook);

    userSettingsService.setSpaceDefaultDisplayOpts({
      sort: {
        by: 'updated',
        descending: true
      }
    });

    collectionService.setItemDisplayOpts(currentNotebook, {
      sort: {
        by: 'order',
        descending: false
      }
    });

    collectionService.setItemDisplayOpts(folderId, {
      sort: {
        by: 'title',
        descending: false
      }
    });

    const defaultOpts = userSettingsService.getDefaultDisplayOpts();
    const folderOpts = collectionService.getItemDisplayOpts(folderId);
    expect(defaultOpts).toEqual({
      sort: {
        by: 'order',
        descending: false
      }
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
    userSettingsService.setSpaceDefaultDisplayOpts({
      sort: {
        by: 'updated',
        descending: true
      }
    });

    collectionService.setItemDisplayOpts(currentNotebook, {
      sort: {
        by: 'order',
        descending: false
      }
    });

    const defaultOpts = userSettingsService.getDefaultDisplayOpts();
    expect(defaultOpts).toEqual({
      sort: {
        by: 'order',
        descending: false
      }
    });
  });

  it('should use space display opts as fallback', () => {
    const currentNotebook = notebooksService.getCurrentNotebook();
    userSettingsService.setSpaceDefaultDisplayOpts({
      sort: {
        by: 'updated',
        descending: true
      }
    });

    collectionService.setItemDisplayOpts(currentNotebook, {
      sort: {
        by: 'order',
        descending: false
      }
    });

    const defaultOpts = userSettingsService.getDefaultDisplayOpts('another');
    expect(defaultOpts).toEqual({
      sort: {
        by: 'updated',
        descending: true
      }
    });
  });
});
