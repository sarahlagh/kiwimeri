import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { Id } from 'tinybase/with-schemas';
import { FolderSettings } from '../collection-settings';
import useNotebookDefaultSettings from './useNotebookDefaultSettings';

export default function useFolderEffectiveSort(
  folderId: Id
): Required<FolderSettings>['sort'] {
  const notebookDefault = useNotebookDefaultSettings();
  const cellValue = useSpaceCell<SpaceTables.Collection, 'settings'>(
    SpaceTables.Collection,
    folderId,
    'settings'
  );

  if (cellValue) {
    const folderSettings = cellValue as FolderSettings;
    if (folderSettings.sort) return folderSettings.sort;
  }
  return notebookDefault.sort;
}
