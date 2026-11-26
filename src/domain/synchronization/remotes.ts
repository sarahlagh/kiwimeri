import { AnyData, WithId } from '@/core/db/types';
import { CellSchema } from 'tinybase/with-schemas';
import { DriverNames } from './drivers/types';

export type RemoteRow = {
  name: string;
  rank: number;
  driver: DriverNames;
  config?: AnyData;
};

export const remotesSchema = {
  name: { type: 'string', required: true },
  rank: { type: 'number', required: true },
  driver: { type: 'string', required: true }, // TODO enum
  config: { type: 'object' }
} as const satisfies Record<keyof RemoteRow, CellSchema>;

export type Remote = WithId<RemoteRow>;
