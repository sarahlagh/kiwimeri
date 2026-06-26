import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import notebooksService from '@/db/notebooks.service';
import { Id } from 'tinybase/with-schemas';
import { SpaceSettings } from '../model';
import useSpaceDefaultSettings from './useSpaceDefaultSettings';

export default function useNotebookDefaultSettings(
  notebook?: Id
): SpaceSettings {
  if (!notebook) {
    notebook = notebooksService.getCurrentNotebook();
  }
  const spaceDefault = useSpaceDefaultSettings();
  const cellValue = useSpaceCell<SpaceTables.Collection, 'settings'>(
    SpaceTables.Collection,
    notebook,
    'settings'
  );
  if (cellValue) {
    return { ...spaceDefault, ...cellValue };
  }
  return spaceDefault;
}
