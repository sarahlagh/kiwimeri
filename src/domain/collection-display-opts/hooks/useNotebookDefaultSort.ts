import { SID } from '@/core/db/store-schema';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import notebooksService from '@/db/notebooks.service';
import { Id } from 'tinybase/with-schemas';
import { NotebookDisplayOpts } from '../model';
import useSpaceDefaultSort from './useSpaceDefaultSort';

export default function useNotebookDefaultSort(
  notebook?: Id
): NotebookDisplayOpts['sort'] {
  if (!notebook) {
    notebook = notebooksService.getCurrentNotebook();
  }
  const spaceDefault = useSpaceDefaultSort();
  const cellValue = useSpaceCell<'collection', 'display_opts'>(
    'collection',
    notebook,
    'display_opts',
    SID.space
  );
  return cellValue !== undefined
    ? (cellValue as NotebookDisplayOpts).sort
    : spaceDefault;
}
