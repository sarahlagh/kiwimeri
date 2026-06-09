import { SID } from '@/core/db/store-schema';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { Id } from 'tinybase/with-schemas';
import { FolderDisplayOpts } from '../model';
import useNotebookDefaultSort from './useNotebookDefaultSort';

export default function useFolderEffectiveSort(
  folderId: Id
): FolderDisplayOpts['sort'] {
  const notebookDefault = useNotebookDefaultSort();
  const cellValue = useSpaceCell<'collection', 'display_opts'>(
    'collection',
    folderId,
    'display_opts',
    SID.space
  );
  return cellValue !== undefined
    ? (cellValue as FolderDisplayOpts).sort
    : notebookDefault;
}
