import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import notebooksService from '@/db_to_migrate/notebooks.service';
import { Id } from 'tinybase/with-schemas';
import { NotebookSettings } from '../../collection/collection-settings';

export default function useNotebookLastBrowserMode(
  notebook?: Id
): Required<NotebookSettings>['browserMode'] {
  if (!notebook) {
    notebook = notebooksService.useCurrentNotebook();
  }
  const cellValue = useSpaceCell<SpaceTables.Collection, 'settings'>(
    SpaceTables.Collection,
    notebook,
    'settings'
  ) as NotebookSettings | undefined;

  return cellValue?.browserMode || 0;
}
