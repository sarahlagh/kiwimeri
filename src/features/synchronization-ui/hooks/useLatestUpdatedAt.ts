import { spaceMetrics } from '@/core/db/store';
import { useSpaceMetric } from '@/core/db/tinybase-hooks';
import { LatestCollectionUpdateMetricId } from '../local-changes-ui/metrics';

export default function useLatestUpdatedAt() {
  return useSpaceMetric(LatestCollectionUpdateMetricId, spaceMetrics) || 0;
}
