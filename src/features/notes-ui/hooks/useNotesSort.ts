import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import {
  DocumentSettings,
  NotesSort
} from '@/domain/collection-settings/model';
import { Id } from 'tinybase/common';

const useNotesSort = (rowId: Id): NotesSort => {
  const settings = useSpaceCell<SpaceTables.Collection, 'settings'>(
    SpaceTables.Collection,
    rowId,
    'settings',
    'space'
  );
  if (settings) {
    const opts = settings as DocumentSettings;
    if (opts.documentSort) {
      return opts.documentSort;
    }
  }
  // return default
  return { by: 'createdAt', descending: false };
};
export default useNotesSort;
