import { AnyData, WithId } from '@/core/db/types';
import { DriverNames } from '../drivers/model';

export type RemoteRow = {
  name: string;
  rank: number;
  driver: DriverNames;
  config?: AnyData;
};

export const remotesSchema = {
  name: { type: 'string' },
  rank: { type: 'number' },
  driver: { type: 'string' },
  config: { type: 'object' }
} as const satisfies Record<keyof RemoteRow, unknown>;

export type Remote = WithId<RemoteRow>;
