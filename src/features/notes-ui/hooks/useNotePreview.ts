import { PREVIEW_SIZE } from '@/constants';
import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { Id } from 'tinybase/with-schemas';

const useNotePreview = (rowId: Id) => {
  const plainText = useSpaceCell<'document_annotation', 'plainText'>(
    SpaceTables.Annotations,
    rowId,
    'plainText',
    'space'
  );
  return plainText?.substring(0, PREVIEW_SIZE);
};
export default useNotePreview;
