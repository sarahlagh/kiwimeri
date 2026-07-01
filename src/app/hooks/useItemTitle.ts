import { ROOT_COLLECTION } from '@/constants';
import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import collectionService from '@/domain/collection/collection.service';
import { Id } from 'tinybase/with-schemas';

const C = SpaceTables.Collection;

export default function useItemTitle(rowId: Id) {
  const title = useSpaceCell<typeof C, 'title'>(C, rowId, 'title');
  const parentId =
    useSpaceCell<typeof C, 'parentId'>(C, rowId, 'parentId') || ROOT_COLLECTION;
  return collectionService.getItemTitleOrDefault(parentId, title);
}
