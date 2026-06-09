import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-schema';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { Id } from 'tinybase/with-schemas';
import { userPrefs } from '../user-preferences/user-preferences.service';
import {
  CollectionItemSortType,
  DocumentDisplayOpts,
  FolderDisplayOpts,
  NotebookDisplayOpts
} from './model';

const C = SpaceTables.C;

class EffectiveDisplayOptsService {
  public getSpaceDefaultSort(): NotebookDisplayOpts['sort'] {
    const by = userPrefs.get('defaultSortBy') as CollectionItemSortType;
    const descending = userPrefs.get<'defaultSortDesc'>('defaultSortDesc');
    return {
      by,
      descending
    };
  }

  public setSpaceDefaultSort(sort: NotebookDisplayOpts['sort']) {
    if (sort.by === 'order') sort.descending = false;
    space.transaction(() => {
      userPrefs.set('defaultSortBy', sort.by);
      userPrefs.set('defaultSortDesc', sort.descending);
    });
  }

  public getNotebookDefaultSort(notebook?: Id): NotebookDisplayOpts['sort'] {
    if (!notebook) {
      notebook = notebooksService.getCurrentNotebook();
    }
    const notebookDisplayOpts = space.getCell(C, notebook, 'display_opts');
    if (notebookDisplayOpts) {
      return (notebookDisplayOpts as NotebookDisplayOpts).sort;
    }
    return this.getSpaceDefaultSort();
  }

  public setNotebookDefaultSort(
    notebook: Id,
    sort: NotebookDisplayOpts['sort']
  ) {
    const notebookDisplayOpts = space.getCell(C, notebook, 'display_opts');
    if (notebookDisplayOpts) {
      const newOpts = { ...notebookDisplayOpts, sort };
      this.setNotebookDisplayOpts(notebook, newOpts);
    } else {
      this.setNotebookDisplayOpts(notebook, { sort });
    }
  }

  public setNotebookDefaultBrowserMode(
    notebook: Id,
    lastBrowserMode: NotebookDisplayOpts['lastBrowserMode']
  ) {
    const notebookDisplayOpts = space.getCell(
      C,
      notebook,
      'display_opts'
    ) as NotebookDisplayOpts;
    if (notebookDisplayOpts) {
      const newOpts = { ...notebookDisplayOpts, lastBrowserMode };
      this.setNotebookDisplayOpts(notebook, newOpts);
    } else {
      const newOpts = { sort: this.getSpaceDefaultSort(), lastBrowserMode };
      this.setNotebookDisplayOpts(notebook, newOpts);
    }
  }

  public setNotebookDisplayOpts(rowId: Id, display_opts: NotebookDisplayOpts) {
    if (display_opts.sort.by === 'order') display_opts.sort.descending = false;
    collectionService.setItemDisplayOpts(rowId, display_opts);
  }

  public setFolderSort(folderId: Id, sort: FolderDisplayOpts['sort']) {
    const folderDisplayOpts = space.getCell(C, folderId, 'display_opts');
    if (folderDisplayOpts) {
      const newOpts = { ...folderDisplayOpts, sort };
      this.setFolderDisplayOpts(folderId, newOpts);
    } else {
      this.setFolderDisplayOpts(folderId, { sort });
    }
  }

  public setFolderDisplayOpts(rowId: Id, display_opts: FolderDisplayOpts) {
    if (display_opts.sort.by === 'order') display_opts.sort.descending = false;
    collectionService.setItemDisplayOpts(rowId, display_opts);
  }

  public setDocumentSort(
    rowId: Id,
    documentSort: DocumentDisplayOpts['documentSort']
  ) {
    if (documentSort?.by === 'order') documentSort.descending = false;
    const display_opts = this.getDocumentDisplayOpts(rowId);
    if (display_opts) {
      collectionService.setItemDisplayOpts(rowId, {
        ...display_opts,
        documentSort
      });
    } else {
      collectionService.setItemDisplayOpts(rowId, { documentSort });
    }
  }

  public setDocumentDisplayOpts(rowId: Id, display_opts: DocumentDisplayOpts) {
    if (display_opts.documentSort?.by === 'order')
      display_opts.documentSort.descending = false;
    collectionService.setItemDisplayOpts(rowId, display_opts);
  }

  public getFolderDisplayOpts(rowId: Id): FolderDisplayOpts | undefined {
    return space.getCell(C, rowId, 'display_opts') as FolderDisplayOpts;
  }

  public getDocumentDisplayOpts(rowId: Id): DocumentDisplayOpts | undefined {
    return space.getCell(C, rowId, 'display_opts') as DocumentDisplayOpts;
  }
}
export const displayOptsService = new EffectiveDisplayOptsService();
