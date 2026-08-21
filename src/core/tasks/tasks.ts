import { AnyObject } from 'tinybase/with-schemas';
import { WithId } from '../db/types';

export type ScheduledTaskRow = {
  scheduledAt: number;
  createdAt: number;
  inputs?: AnyObject;
  //   completedAt: number;
  // might need something about recurrence - if scheduler starts but recurring task not registered yet, don't just delete it?
  error?: string;
};

export const tasksSchema = {
  scheduledAt: { type: 'number' },
  createdAt: { type: 'number' },
  inputs: { type: 'object' },
  error: { type: 'string' }
} as const satisfies Record<keyof ScheduledTaskRow, unknown>;

export type ScheduledTask = WithId<ScheduledTaskRow>;
