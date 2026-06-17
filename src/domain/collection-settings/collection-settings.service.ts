import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-schema';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { Id } from 'tinybase/with-schemas';
import { userPrefs } from '../user-preferences/user-preferences.service';
import {
  CollectionItemSettings,
  CollectionItemSortType,
  DocumentSettings,
  FolderSettings,
  NotebookSettings,
  SpaceSettings
} from './model';

const C = SpaceTables.Collection;

class CollectionSettingsService {
  public getSpaceDefaultSort(): Required<NotebookSettings>['sort'] {
    const by = userPrefs.get('defaultSortBy') as CollectionItemSortType;
    const descending = userPrefs.get<'defaultSortDesc'>('defaultSortDesc');
    return {
      by,
      descending
    };
  }

  public getSpaceDefaultSettings(): SpaceSettings {
    const sort = this.getSpaceDefaultSort();
    let statsEnabled = userPrefs.get<'statsEnabled'>('statsEnabled');
    if (statsEnabled === undefined) {
      statsEnabled = userPrefs.getDefault<'statsEnabled'>('statsEnabled');
    }
    return {
      sort,
      statsEnabled
    };
  }

  public setSpaceDefaultSort(sort: Required<NotebookSettings>['sort']) {
    if (sort.by === 'order') sort.descending = false;
    space.transaction(() => {
      userPrefs.set('defaultSortBy', sort.by);
      userPrefs.set('defaultSortDesc', sort.descending);
    });
  }

  public setSpaceDefaultStatsEnabled(statsEnabled: boolean | null) {
    userPrefs.set('statsEnabled', statsEnabled);
  }

  public getNotebookDefaultSort(
    notebook?: Id
  ): Required<NotebookSettings>['sort'] {
    if (!notebook) {
      notebook = notebooksService.getCurrentNotebook();
    }
    const cellValue = space.getCell(C, notebook, 'settings');
    if (cellValue) {
      const notebookSettings = cellValue as NotebookSettings;
      if (notebookSettings.sort) return notebookSettings.sort;
    }
    return this.getSpaceDefaultSort();
  }

  public getNotebookDefaultStatsEnabled(
    notebook?: Id
  ): Required<NotebookSettings>['statsEnabled'] {
    if (!notebook) {
      notebook = notebooksService.getCurrentNotebook();
    }
    const cellValue = space.getCell(C, notebook, 'settings');
    if (cellValue) {
      const notebookSettings = cellValue as NotebookSettings;
      if (notebookSettings.statsEnabled !== undefined)
        return notebookSettings.statsEnabled;
    }
    return this.getSpaceDefaultSettings().statsEnabled;
  }

  private mergeCellValue<K extends keyof CollectionItemSettings>(
    rowId: string,
    key: K,
    valToMerge: CollectionItemSettings[K],
    callback?: (cellValue: CollectionItemSettings) => void
  ) {
    if (!callback)
      callback = cellValue =>
        collectionService.setItemSettings(rowId, cellValue);
    let cellValue: CollectionItemSettings | undefined = space.getCell(
      C,
      rowId,
      'settings'
    );
    if (!cellValue) {
      cellValue = {} as CollectionItemSettings;
    }
    cellValue[key] = valToMerge;
    callback(cellValue);
  }

  public setNotebookDefaultSort(notebook: Id, sort: NotebookSettings['sort']) {
    this.mergeCellValue(notebook, 'sort', sort, cv =>
      this.setNotebookSettings(notebook, cv)
    );
  }

  public setNotebookDefaultBrowserMode(
    notebook: Id,
    browserMode: NotebookSettings['browserMode']
  ) {
    this.mergeCellValue(notebook, 'browserMode', browserMode, cv =>
      this.setNotebookSettings(notebook, cv)
    );
  }

  public setNotebookSettings(rowId: Id, settings: NotebookSettings) {
    if (settings.sort?.by === 'order') settings.sort.descending = false;
    collectionService.setItemSettings(rowId, settings);
  }

  public setFolderSort(folderId: Id, sort: FolderSettings['sort']) {
    this.mergeCellValue(folderId, 'sort', sort, cv =>
      this.setFolderSettings(folderId, cv)
    );
  }

  public setFolderSettings(rowId: Id, settings: FolderSettings) {
    if (settings.sort?.by === 'order') settings.sort.descending = false;
    collectionService.setItemSettings(rowId, settings);
  }

  public setDocumentSort(
    rowId: Id,
    documentSort: DocumentSettings['documentSort']
  ) {
    if (documentSort?.by === 'order') documentSort.descending = false;
    this.mergeCellValue(rowId, 'documentSort', documentSort, cv =>
      collectionService.setItemSettings(rowId, cv)
    );
  }

  public setDocumentSettings(rowId: Id, settings: DocumentSettings) {
    if (settings.documentSort?.by === 'order')
      settings.documentSort.descending = false;
    collectionService.setItemSettings(rowId, settings);
  }

  public getNotebookSettings(rowId: Id): NotebookSettings | undefined {
    return space.getCell(C, rowId, 'settings') as NotebookSettings;
  }

  public getFolderSettings(rowId: Id): FolderSettings | undefined {
    return space.getCell(C, rowId, 'settings') as FolderSettings;
  }

  public getDocumentSettings(rowId: Id): DocumentSettings | undefined {
    return space.getCell(C, rowId, 'settings') as DocumentSettings;
  }
}
export const settingsService = new CollectionSettingsService();
