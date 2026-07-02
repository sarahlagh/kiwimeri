import { spaceMetrics } from '@/core/db/store';

export const LatestCollectionUpdateMetricId = 'latestCollectionChange';

export function initLatestCollectionUpdateMetric() {
  if (!spaceMetrics.hasMetric(LatestCollectionUpdateMetricId)) {
    spaceMetrics.setMetricDefinition(
      LatestCollectionUpdateMetricId,
      'collection',
      'max',
      'updatedAt'
    );
  }
}

export function closeLatestCollectionUpdateMetric() {
  spaceMetrics.delMetricDefinition(LatestCollectionUpdateMetricId);
}
