import { spaceMetrics } from '@/core/db/store';
import { SpaceType } from '@/core/db/store-schema';
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
  if (!spaceMetrics.hasMetric(LatestCollectionUpdateMetricId)) {
    latestCollectionUpdateMetric(spaceMetrics);
  }
}

export function closeLatestCollectionUpdateMetric() {
  spaceMetrics.delMetricDefinition(LatestCollectionUpdateMetricId);
}
