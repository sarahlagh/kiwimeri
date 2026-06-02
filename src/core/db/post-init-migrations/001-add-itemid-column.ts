import { SpaceType } from '@/core/db/store-schema';
import { Store } from 'tinybase/with-schemas';

export default function Migration(space: Store<SpaceType>) {
  const rowIds = space.getRowIds('collection');
  rowIds.forEach(rowId => {
    space.setCell('collection', rowId, 'itemId', rowId);
  });
}
