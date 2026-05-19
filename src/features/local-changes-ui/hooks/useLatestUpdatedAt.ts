import { getSpaceMetrics } from '@/core/db/store';
import { useTypedSpaceMetric } from '@/core/db/tinybase-hooks';
import { LatestCollectionUpdateMetricId } from '../metrics';

export default function useLatestUpdatedAt() {
  return (
    useTypedSpaceMetric(LatestCollectionUpdateMetricId, getSpaceMetrics()) || 0
  );
}
