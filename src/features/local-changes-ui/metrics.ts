import { getSpaceMetrics } from '@/core/db/store';
import { SpaceType } from '@/db/types/space-types';
import { Metrics } from 'tinybase/with-schemas';

export const LatestCollectionUpdateMetricId = 'latestCollectionChange';

function latestCollectionUpdateMetric(metrics: Metrics<SpaceType>) {
  metrics.setMetricDefinition(
    LatestCollectionUpdateMetricId,
    'collection',
    'max',
    'updated'
  );
}

export function initLatestCollectionUpdateMetric() {
  const metrics = getSpaceMetrics();
  if (!metrics.hasMetric(LatestCollectionUpdateMetricId)) {
    latestCollectionUpdateMetric(metrics);
  }
}

export function closeLatestCollectionUpdateMetric() {
  getSpaceMetrics().delMetricDefinition(LatestCollectionUpdateMetricId);
}
