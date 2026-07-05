import { spaceMetrics } from '@/core/db/store';
import { SpaceMetrics, SpaceTables } from '@/core/db/store-constants';

export function initLatestCollectionUpdateMetric() {
  if (!spaceMetrics.hasMetric(SpaceMetrics.latestCollectionChange)) {
    spaceMetrics.setMetricDefinition(
      SpaceMetrics.latestCollectionChange,
      SpaceTables.Collection,
      'max',
      'updatedAt'
    );
  }
}

export function closeLatestCollectionUpdateMetric() {
  spaceMetrics.delMetricDefinition(SpaceMetrics.latestCollectionChange);
}
