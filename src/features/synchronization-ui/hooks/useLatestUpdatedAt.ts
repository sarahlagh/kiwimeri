import { spaceMetrics } from '@/core/db/store';
import { SpaceMetrics } from '@/core/db/store-constants';
import { useSpaceMetric } from '@/core/db/ui-hooks';

export default function useLatestUpdatedAt() {
  const collectionLatest =
    useSpaceMetric(SpaceMetrics.latestCollectionChange, spaceMetrics) || 0;
  const annotationLatest =
    useSpaceMetric(SpaceMetrics.latestAnnotationChange, spaceMetrics) || 0;
  const userPrefLatest =
    useSpaceMetric(SpaceMetrics.latestUserPrefChange, spaceMetrics) || 0;
  return Math.max(collectionLatest, annotationLatest, userPrefLatest);
}
