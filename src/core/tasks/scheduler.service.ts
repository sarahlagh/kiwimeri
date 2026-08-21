import { appConfig } from '@/config';
import { getUniqueId } from 'tinybase';
import { AnyObject, getHash } from 'tinybase/with-schemas';
import { store } from '../db/store';
import { StoreTables } from '../db/store-constants';
import { AnyData } from '../db/types';
import { appLog } from '../logs/logs.service';
import { ScheduledTask, ScheduledTaskRow } from './tasks';
import { registerGlobalTasks } from './tasks-registry';

export type TaskCallback = (inputs?: AnyData) => void;
const T = StoreTables.Tasks;

class TaskScheduler {
  private id: NodeJS.Timeout | null = null;
  private callbacks = new Map<string, TaskCallback>();

  public start() {
    registerGlobalTasks();
    this.stop();
    this.id = setInterval(() => {
      const tasks = this.getTasks();
      if (tasks.length === 0) return;
      console.info('[scheduler] got', tasks.length, 'tasks to execute');
      tasks.forEach(task => {
        try {
          this.flush(task.id, task.name, task.inputs);
        } catch (e) {
          store.setCell(T, task.id, 'error', appLog.stringify(e));
        }
      });
    }, appConfig.SCHEDULER_INTERVAL);
  }

  public stop() {
    if (this.id) clearInterval(this.id);
  }

  public register(name: string, callback: TaskCallback) {
    this.callbacks.set(name, callback);
  }

  public at(
    at: number, // absolute date
    name: string,
    inputs?: AnyObject
  ) {
    const task: ScheduledTaskRow = {
      name,
      createdAt: Date.now(),
      scheduledAt: at,
      inputs
    };
    const key = inputs
      ? `${name}-${getHash(JSON.stringify(inputs))}`
      : undefined;
    if (key && store.hasRow(T, key)) {
      return key;
    }
    const rowId = key ? key : getUniqueId();
    store.setRow(T, rowId, { ...task });
    return rowId;
  }

  public in(
    delay: number, // delay to add to now
    name: string,
    inputs?: AnyObject
  ) {
    return this.at(Date.now() + delay, name, inputs);
  }

  public flush(taskId: string, name?: string, inputs?: AnyObject) {
    const _name = name ? name : store.getCell(T, taskId, 'name')!;
    const cb = this.callbacks.get(_name);
    if (!cb) {
      console.warn('task flushed with no callback', taskId, _name);
    } else {
      const _inputs = inputs
        ? inputs
        : (store.getCell(T, taskId, 'inputs') as AnyData);
      cb(_inputs);
    }
    // on success // TODO keep, gc later
    store.delRow(T, taskId);
  }

  private getTasks(date = Date.now(), all = false) {
    const results: ScheduledTask[] = [];
    const table = store.getTable(T);
    const rowIds = store.getSortedRowIds(T, 'scheduledAt', false);
    for (const rowId of rowIds) {
      const row = table[rowId] as ScheduledTaskRow;
      if (!all && row.scheduledAt > date) break;
      if (row.error) continue;
      results.push({ id: rowId, ...row });
    }
    return results;
  }
}

export const schedule = new TaskScheduler();
