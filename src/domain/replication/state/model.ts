import { AnyData } from '@/core/db/types';

export interface ReplicaStateRow {
  connected?: boolean;
  lastPulled?: number;
  lastRemoteChange?: number;
  info?: AnyData;
}

export const replicaStatesSchema = {
  connected: { type: 'boolean' },
  lastRemoteChange: { type: 'number' },
  lastPulled: { type: 'number' },
  info: { type: 'object' }
} as const satisfies Record<keyof ReplicaStateRow, unknown>;
