import { SID } from '@/core/db/store-schema';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import notebooksService from '@/db/notebooks.service';
import { Id } from 'tinybase/with-schemas';
import { NotebookDisplayOpts } from '../model';

export default function useNotebookLastBrowserMode(
  notebook?: Id
): Required<NotebookDisplayOpts>['lastBrowserMode'] {
  if (!notebook) {
    notebook = notebooksService.useCurrentNotebook();
  }
  const cellValue = useSpaceCell<'collection', 'display_opts'>(
    'collection',
    notebook,
    'display_opts',
    SID.space
  ) as NotebookDisplayOpts | undefined;

  return cellValue?.lastBrowserMode || 0;
}
