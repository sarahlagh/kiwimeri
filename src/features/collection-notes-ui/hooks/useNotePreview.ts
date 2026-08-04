import { ANNOT_PREVIEW_SIZE } from '@/constants';
import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { Id } from 'tinybase/with-schemas';

const useNotePreview = (rowId: Id) => {
  const previewText = useSpaceCell<SpaceTables.AnnotationView, 'previewText'>(
    SpaceTables.AnnotationView,
    rowId,
    'previewText'
  );
  return previewText?.substring(0, ANNOT_PREVIEW_SIZE); // keep if < doc size
};
export default useNotePreview;
