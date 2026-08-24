import { appConfig } from '@/config';
import { getUniqueId } from 'tinybase';
import { AnyObject, getHash } from 'tinybase/with-schemas';
import { space } from '../db/store';
import { SpaceTables } from '../db/store-constants';
import { AnyData } from '../db/types';
import { appLog } from '../logs/logs.service';
import { ScheduledTask, ScheduledTaskRow } from './tasks';
import { registerGlobalTasks } from './tasks-registry';

export type TaskCallback = (inputs?: AnyData) => void;
const T = SpaceTables.Tasks;

class TaskScheduler {
  private enabled = true;
  private id: NodeJS.Timeout | null = null;
  private callbacks = new Map<string, TaskCallback>();

  public start() {
    if (!this.enabled) return;
    registerGlobalTasks();
    this.stop();
    this.id = setInterval(() => {
      const tasks = this.getTasks();
      if (tasks.length === 0) return;
      tasks.forEach(task => {
        try {
          this.flush(task.id, task.name, task.inputs);
        } catch (e) {
          space.setCell(T, task.id, 'error', appLog.stringify(e));
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
    if (!this.enabled) return;
    const task: ScheduledTaskRow = {
      name,
      createdAt: Date.now(),
      scheduledAt: at,
      inputs
    };
    const key = inputs
      ? `${name}-${getHash(JSON.stringify(inputs))}`
      : undefined;
    if (key && space.hasRow(T, key)) {
      return key;
    }
    const rowId = key ? key : getUniqueId();
    space.setRow(T, rowId, { ...task });
    return rowId;
  }

  public in(
    delay: number, // delay to add to now
    name: string,
    inputs?: AnyObject
  ) {
    return this.at(Date.now() + delay, name, inputs);
  }

  public flushByName(name: string) {
    const tasks = this.getTasks(true).filter(t => t.name === name);
    tasks.forEach(task => {
      const inputs = space.getCell(T, task.id, 'inputs');
      this.flush(task.id, name, inputs);
    });
  }

  public cancel(taskId: string) {
    space.delRow(T, taskId);
  }

  private flush(taskId: string, name: string, inputs?: AnyObject) {
    const cb = this.callbacks.get(name);
    if (!cb) {
      console.warn('task flushed with no callback', taskId, name);
    } else {
      cb(inputs);
    }
    // on success // TODO keep, gc later
    space.delRow(T, taskId);
  }

  private getTasks(all = false) {
    const date = Date.now();
    const results: ScheduledTask[] = [];
    const table = space.getTable(T);
    const rowIds = space.getSortedRowIds(T, 'scheduledAt', false);
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
