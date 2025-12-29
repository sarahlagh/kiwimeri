import { CollectionItemType } from '@/collection/collection';
import { Store } from 'tinybase/with-schemas';
import { historyService } from '../collection-history.service';
import { SpaceType } from '../types/space-types';

export default function Migration(space: Store<SpaceType>) {
  const collection = space.getTable('collection');
  const rowIds = space.getRowIds('collection');
  rowIds.forEach(rowId => {
    if (collection[rowId].type !== CollectionItemType.document) return;
    historyService.saveWholeDocumentVersion(rowId, true);
  });
}
