import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { NotebookSettings } from '@/domain/collection/collection-settings';
import { useCurrentNotebook } from '@/features/collection-notebooks-ui';
import { Id } from 'tinybase/with-schemas';

export default function useNotebookLastBrowserMode(
  notebook?: Id
): Required<NotebookSettings>['browserMode'] {
  if (!notebook) {
    notebook = useCurrentNotebook();
  }
  const cellValue = useSpaceCell<SpaceTables.Collection, 'settings'>(
    SpaceTables.Collection,
    notebook,
    'settings'
  ) as NotebookSettings | undefined;

  return cellValue?.browserMode || 0;
}
