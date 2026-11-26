import { AnyObject, CellSchema } from 'tinybase/with-schemas';
import { WithId } from '../db/types';

export type ScheduledTaskRow = {
  name: string;
  scheduledAt: number;
  createdAt: number;
  inputs?: AnyObject;
  error?: string;
};

export const tasksSchema = {
  name: { type: 'string', required: true },
  scheduledAt: { type: 'number', required: true },
  createdAt: { type: 'number', required: true },
  inputs: { type: 'object' },
  error: { type: 'string' }
} as const satisfies Record<keyof ScheduledTaskRow, CellSchema>;

export type ScheduledTask = WithId<ScheduledTaskRow>;
