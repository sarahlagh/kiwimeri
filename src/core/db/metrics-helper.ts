import { SpaceType } from '@/db/types/space-types';
import { StoreType } from '@/db/types/store-types';
import { Metrics } from 'tinybase/with-schemas';
import { getSpaceMetrics, getStoreMetrics } from './store';

export function getStoreMetric(
  metricId: string,
  initialize: (metrics: Metrics<StoreType>) => void
) {
  const metrics = getStoreMetrics();
  if (!metrics.hasMetric(metricId)) {
    initialize(metrics);
  }
  return metrics.getMetric(metricId);
}

export function getSpaceMetric(
  metricId: string,
  initialize: (metrics: Metrics<SpaceType>) => void
) {
  const metrics = getSpaceMetrics();
  if (!metrics.hasMetric(metricId)) {
    initialize(metrics);
  }
  return metrics.getMetric(metricId);
}
