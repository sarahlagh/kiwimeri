import { CollectionItemType } from '@/collection/collection';
import { SpaceType } from '@/core/db/store-schema';
import { Store } from 'tinybase/with-schemas';
import { historyService } from '../collection-history.service';

export default function Migration(space: Store<SpaceType>) {
  const collection = space.getTable('collection');
  const rowIds = space.getRowIds('collection');
  rowIds.forEach(rowId => {
    if (collection[rowId].type !== CollectionItemType.document) return;
    historyService.addVersion(rowId, true);
  });
}
