import { PREVIEW_SIZE } from '@/constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { Id } from 'tinybase/with-schemas';

export const useCommentPreview = (rowId: Id) => {
  const plainText = useSpaceCell<'comments', 'plainText'>(
    'comments',
    rowId,
    'plainText'
  ) as string;
  return plainText.substring(0, PREVIEW_SIZE);
};
