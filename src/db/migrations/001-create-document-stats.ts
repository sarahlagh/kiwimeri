import { CollectionItemType, isDocument } from '@/collection/collection';
import { statsService } from '@/stats/stats-service';
import { Store } from 'tinybase/with-schemas';
import { historyService } from '../collection-history.service';
import { SpaceType } from '../types/space-types';

export default function Migration(space: Store<SpaceType>) {
  const collection = space.getTable('collection');
  const rowIds = space.getRowIds('collection');
  rowIds.forEach(rowId => {
    if (!isDocument({ type: collection[rowId].type as CollectionItemType }))
      return;

    // backfill stats from versions in reverse order
    const versions = historyService
      .getVersions(rowId)
      .filter(v => v.op === 'snapshot');

    for (let i = versions.length - 1; i >= 0; i--) {
      const version = versions[i];
      const plain = version.preview;
      const content_meta = version.snapshotJson.content_meta!;
      const stats = statsService.buildStats(plain, content_meta);
      statsService.updateTodaysStats(rowId, stats);
      statsService.updateGlobalStats(rowId, { lastOpened: stats.updatedAt! });
    }
  });
}
