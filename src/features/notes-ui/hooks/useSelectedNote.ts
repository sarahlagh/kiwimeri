import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { Id } from 'tinybase/with-schemas';

const useSelectedNote = (docId: Id): string | undefined => {
  return useSpaceCell<SpaceTables.ResumeState, 'lastSelectedNoteId'>(
    SpaceTables.ResumeState,
    docId,
    'lastSelectedNoteId',
    'space'
  );
};
export default useSelectedNote;
