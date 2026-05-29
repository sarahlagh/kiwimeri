import { PREVIEW_SIZE } from '@/constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { DOC_ANNOTATION_TABLE } from '@/domain/document-annotations/model';
import { Id } from 'tinybase/with-schemas';

const useCommentPreview = (rowId: Id) => {
  const plainText = useSpaceCell<'document_annotation', 'plainText'>(
    DOC_ANNOTATION_TABLE,
    rowId,
    'plainText',
    'space'
  );
  return plainText?.substring(0, PREVIEW_SIZE);
};
export default useCommentPreview;
