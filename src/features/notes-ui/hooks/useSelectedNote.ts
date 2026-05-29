import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { Id } from 'tinybase/with-schemas';

const useSelectedNote = (docId: Id): string | undefined => {
  return useSpaceCell<'document_resume_state', 'lastSelectedNoteId'>(
    'document_resume_state',
    docId,
    'lastSelectedNoteId',
    'space'
  );
};
export default useSelectedNote;
