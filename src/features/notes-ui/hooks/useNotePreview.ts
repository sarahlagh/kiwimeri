import { PREVIEW_SIZE } from '@/constants';
import { SID, SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { Id } from 'tinybase/with-schemas';

const useNotePreview = (rowId: Id) => {
  const plainText = useSpaceCell<SpaceTables.DerivedContent, 'plainText'>(
    SpaceTables.DerivedContent,
    rowId,
    'plainText',
    SID.space
  );
  return plainText?.substring(0, PREVIEW_SIZE);
};
export default useNotePreview;
