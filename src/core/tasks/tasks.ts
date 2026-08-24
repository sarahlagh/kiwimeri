import { AnyObject } from 'tinybase/with-schemas';
import { WithId } from '../db/types';

export type ScheduledTaskRow = {
  name: string;
  scheduledAt: number;
  createdAt: number;
  inputs?: AnyObject;
  error?: string;
};

export const tasksSchema = {
  name: { type: 'string' },
  scheduledAt: { type: 'number' },
  createdAt: { type: 'number' },
  inputs: { type: 'object' },
  error: { type: 'string' }
} as const satisfies Record<keyof ScheduledTaskRow, unknown>;

export type ScheduledTask = WithId<ScheduledTaskRow>;
