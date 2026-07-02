import { ANNOT_PREVIEW_SIZE } from '@/constants';
import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { getDerivedId } from '@/domain/collection/derived-content';
import { Id } from 'tinybase/with-schemas';

const useNotePreview = (rowId: Id) => {
  const plainText = useSpaceCell<SpaceTables.DerivedContent, 'plainText'>(
    SpaceTables.DerivedContent,
    getDerivedId('a', rowId),
    'plainText'
  );
  return plainText?.substring(0, ANNOT_PREVIEW_SIZE);
};
export default useNotePreview;
