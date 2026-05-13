import { SpaceType } from '@/db/types/space-types';
import { Metrics } from 'tinybase/with-schemas';

export const LatestCollectionUpdateMetricId = 'latestCollectionChange';

export function latestCollectionUpdateMetric(metrics: Metrics<SpaceType>) {
  metrics.setMetricDefinition(
    LatestCollectionUpdateMetricId,
    'collection',
    'max',
    'updated'
  );
}
