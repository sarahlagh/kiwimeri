import { getSpaceMetrics } from '@/core/db/store';
import { useTypedSpaceMetric } from '@/core/db/tinybase-hooks';
import {
  LatestCollectionUpdateMetricId,
  latestCollectionUpdateMetric
} from '../metrics';

export default function useLatestUpdatedAt() {
  const metrics = getSpaceMetrics();
  if (!metrics.hasMetric(LatestCollectionUpdateMetricId)) {
    latestCollectionUpdateMetric(metrics);
  }
  return useTypedSpaceMetric(LatestCollectionUpdateMetricId, metrics) || 0;
}
