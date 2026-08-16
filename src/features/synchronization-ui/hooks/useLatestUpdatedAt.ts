import { spaceMetrics } from '@/core/db/store';
import { SpaceMetrics } from '@/core/db/store-constants';
import { useSpaceMetric } from '@/core/db/ui-hooks';

export default function useLatestUpdatedAt() {
  return useSpaceMetric(SpaceMetrics.latestCollectionChange, spaceMetrics) || 0;
}
