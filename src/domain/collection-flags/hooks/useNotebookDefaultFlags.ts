import { SID } from '@/core/db/store-schema';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import notebooksService from '@/db/notebooks.service';
import { Id } from 'tinybase/with-schemas';
import { NotebookFlags } from '../model';
import useSpaceDefaultFlags from './useSpaceDefaultFlags';

export default function useNotebookDefaultFlags(
  notebook?: Id
): Required<NotebookFlags> {
  if (!notebook) {
    notebook = notebooksService.getCurrentNotebook();
  }
  const spaceDefault = useSpaceDefaultFlags();
  const cellValue = useSpaceCell<'collection', 'flags'>(
    'collection',
    notebook,
    'flags',
    SID.space
  );
  if (cellValue) {
    return { ...spaceDefault, ...cellValue };
  }
  return spaceDefault;
}
