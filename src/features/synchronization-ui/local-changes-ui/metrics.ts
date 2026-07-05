import { spaceMetrics } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';

export const LatestCollectionUpdateMetricId = 'latestCollectionChange';

export function initLatestCollectionUpdateMetric() {
  if (!spaceMetrics.hasMetric(LatestCollectionUpdateMetricId)) {
    spaceMetrics.setMetricDefinition(
      LatestCollectionUpdateMetricId,
      SpaceTables.Collection,
      'max',
      'updatedAt'
    );
  }
}

export function closeLatestCollectionUpdateMetric() {
  spaceMetrics.delMetricDefinition(LatestCollectionUpdateMetricId);
}
