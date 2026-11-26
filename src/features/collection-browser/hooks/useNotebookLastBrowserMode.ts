import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/ui-hooks';
import { NotebookSettings } from '@/domain/collection/collection-settings';
import notebooksService from '@/domain/collection/notebooks.service';
import { Id } from 'tinybase/with-schemas';

export default function useNotebookLastBrowserMode(
  notebook?: Id
): Required<NotebookSettings>['browserMode'] {
  if (!notebook) {
    notebook = notebooksService.getCurrentNotebook();
  }
  const cellValue = useSpaceCell<SpaceTables.Collection, 'settings'>(
    SpaceTables.Collection,
    notebook,
    'settings'
  ) as NotebookSettings | undefined;

  return cellValue?.browserMode || 0;
}
