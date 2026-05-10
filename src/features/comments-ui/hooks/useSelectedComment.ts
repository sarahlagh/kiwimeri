import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { Id } from 'tinybase/with-schemas';

const useSelectedComment = (docId: Id): string => {
  return useSpaceCell<'document_resume_state', 'lastSelectedCommentId'>(
    'document_resume_state',
    docId,
    'lastSelectedCommentId'
  ) as string;
};
export default useSelectedComment;
