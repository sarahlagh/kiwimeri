import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { SpaceSettings } from '@/domain/collection/collection-settings';
import notebooksService from '@/domain/collection/notebooks.service';
import { Id } from 'tinybase/with-schemas';
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
