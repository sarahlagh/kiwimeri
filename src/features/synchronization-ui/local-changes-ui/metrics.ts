import { spaceMetrics } from '@/core/db/store';
import { SpaceMetrics, SpaceTables } from '@/core/db/store-constants';

export function initLatestUpdateMetrics() {
  if (!spaceMetrics.hasMetric(SpaceMetrics.latestCollectionChange)) {
    spaceMetrics.setMetricDefinition(
      SpaceMetrics.latestCollectionChange,
      SpaceTables.Collection,
      'max',
      'updatedAt' // no need to look at lastActivityAt
    );
  }
  if (!spaceMetrics.hasMetric(SpaceMetrics.latestAnnotationChange)) {
    spaceMetrics.setMetricDefinition(
      SpaceMetrics.latestAnnotationChange,
      SpaceTables.Annotations,
      'max',
      'updatedAt'
    );
  }
  if (!spaceMetrics.hasMetric(SpaceMetrics.latestUserPrefChange)) {
    spaceMetrics.setMetricDefinition(
      SpaceMetrics.latestUserPrefChange,
      SpaceTables.UserPreference,
      'max',
      'updatedAt'
    );
  }
}

export function closeLatestUpdateMetrics() {
  spaceMetrics.delMetricDefinition(SpaceMetrics.latestCollectionChange);
  spaceMetrics.delMetricDefinition(SpaceMetrics.latestAnnotationChange);
  spaceMetrics.delMetricDefinition(SpaceMetrics.latestUserPrefChange);
}
