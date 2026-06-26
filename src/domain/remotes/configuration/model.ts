import { AnyData } from '@/core/db/types';
import { DriverNames } from '../drivers/model';

export type RemoteRow = {
  name: string;
  rank: number;
  type: DriverNames;
  config?: AnyData;
};

export const remotesSchema = {
  name: { type: 'string' },
  rank: { type: 'number' },
  type: { type: 'string' },
  config: { type: 'object' }
} as const satisfies Record<keyof RemoteRow, unknown>;
