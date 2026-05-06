import { Store } from 'tinybase/with-schemas';
import { SpaceType } from '../types/space-types';

export default function Migration(space: Store<SpaceType>) {
  const rowIds = space.getRowIds('collection');
  rowIds.forEach(rowId => {
    space.setCell('collection', rowId, 'itemId', rowId);
  });
}
