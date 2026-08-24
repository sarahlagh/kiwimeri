import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { SpaceTables } from '@/core/db/store-constants';
import { ScheduledTask } from '@/core/tasks/tasks';
import { ParamValues } from 'tinybase/with-schemas';

export type TaskResult = Pick<
  ScheduledTask,
  'id' | 'name' | 'scheduledAt' | 'error'
>;

const fetchTasksQuery = new SpaceQueryDefinition<
  ParamValues,
  TaskResult,
  SpaceTables.Tasks
>(
  'fetchTasks',
  SpaceTables.Tasks,
  ({ select }) => {
    select('name');
    select('scheduledAt');
    select('error');
  },
  'scheduledAt',
  false
);

export default fetchTasksQuery;
