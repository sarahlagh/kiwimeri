import { DocumentDisplayOpts } from '@/collection/collection';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { NotesSort } from '@/domain/document-annotations/model';
import { Id } from 'tinybase/common';

const useNotesSort = (rowId: Id): NotesSort => {
  const display_opts = useSpaceCell<'collection', 'display_opts'>(
    'collection',
    rowId,
    'display_opts',
    'space'
  );
  if (display_opts) {
    const opts = display_opts as DocumentDisplayOpts;
    return opts.documentSort;
  }
  // return default
  return { by: 'createdAt', descending: false };
};
export default useNotesSort;
