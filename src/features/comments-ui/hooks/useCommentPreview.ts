import { PREVIEW_SIZE } from '@/constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { Id } from 'tinybase/with-schemas';

const useCommentPreview = (rowId: Id) => {
  const plainText = useSpaceCell<'comments', 'plainText'>(
    'comments',
    rowId,
    'plainText',
    'space'
  );
  return plainText?.substring(0, PREVIEW_SIZE);
};
export default useCommentPreview;
