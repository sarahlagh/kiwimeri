import { SID, SpaceTables } from '@/core/db/store-schema';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { Id } from 'tinybase/with-schemas';
import { FolderSettings } from '../model';
import useNotebookDefaultSettings from './useNotebookDefaultSettings';

export default function useFolderEffectiveSort(
  folderId: Id
): Required<FolderSettings>['sort'] {
  const notebookDefault = useNotebookDefaultSettings();
  const cellValue = useSpaceCell<SpaceTables.Collection, 'settings'>(
    SpaceTables.Collection,
    folderId,
    'settings',
    SID.space
  );

  if (cellValue) {
    const folderSettings = cellValue as FolderSettings;
    if (folderSettings.sort) return folderSettings.sort;
  }
  return notebookDefault.sort;
}
