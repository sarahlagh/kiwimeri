import { spaceMetrics } from '@/core/db/store';
import { SpaceType } from '@/core/db/store-schema';
import { Metrics } from 'tinybase/with-schemas';

export const LatestUserPreferenceUpdateMetricId = 'latestUserPreferenceChange';

function latestUserPreferenceUpdateMetric(metrics: Metrics<SpaceType>) {
  metrics.setMetricDefinition(
    LatestUserPreferenceUpdateMetricId,
    'user_preference',
    'max',
    'updatedAt'
  );
}

export function initLatestUserPreferenceUpdateMetric() {
  if (!spaceMetrics.hasMetric(LatestUserPreferenceUpdateMetricId)) {
    latestUserPreferenceUpdateMetric(spaceMetrics);
  }
}

export function closeLatestUserPreferenceUpdateMetric() {
  spaceMetrics.delMetricDefinition(LatestUserPreferenceUpdateMetricId);
}
