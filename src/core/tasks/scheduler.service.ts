import { appConfig } from '@/config';
import { getUniqueId } from 'tinybase';
import { AnyObject, getHash } from 'tinybase/with-schemas';
import { space } from '../db/store';
import { SpaceTables } from '../db/store-constants';
import { appLog } from '../logs/logs.service';
import { ScheduledTask, ScheduledTaskRow } from './tasks';
import { TaskNames, taskRegistry } from './tasks-registry';

const T = SpaceTables.Tasks;

class TaskScheduler {
  private enabled = true;
  private id: NodeJS.Timeout | null = null;

  public start() {
    if (!this.enabled) return;
    this.stop();
    taskRegistry.init();
    this.initRecurringTasks();
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
    if (this.id) {
      clearInterval(this.id);
      this.id = null;
    }
  }

  public at(
    atInMs: number, // absolute date
    name: string,
    inputs?: AnyObject
  ) {
    if (!this.enabled) return null;
    const key = inputs
      ? `${name}-${getHash(JSON.stringify(inputs))}`
      : undefined;
    if (key && space.hasRow(T, key)) {
      return key;
    }
    const task: ScheduledTaskRow = {
      name,
      createdAt: Date.now(),
      scheduledAt: atInMs,
      inputs
    };
    const rowId = key ? key : getUniqueId();
    space.setRow(T, rowId, { ...task });
    return rowId;
  }

  public in(
    delayInMs: number, // delay to add to now
    name: string,
    inputs?: AnyObject
  ) {
    return this.at(Date.now() + delayInMs, name, inputs);
  }

  public hasTask(name: string, inputs?: AnyObject) {
    const rowId = inputs ? `${name}-${getHash(JSON.stringify(inputs))}` : name;
    return space.hasRow(T, rowId) ? rowId : null;
  }

  public debounce(debounceInMs: number, name: string, inputs?: AnyObject) {
    const rowId = inputs ? `${name}-${getHash(JSON.stringify(inputs))}` : name;
    if (space.hasRow(T, rowId)) {
      // const scheduledAt = space.getCell(T, rowId, 'scheduledAt')!;
      space.setCell(T, rowId, 'scheduledAt', Date.now() + debounceInMs);
      return rowId;
    }
    return this.in(debounceInMs, name, inputs);
  }

  private initRecurringTasks() {
    this.startRecurring(TaskNames.LOG_GC, 3600_000); // every hour
    this.startRecurring(TaskNames.HISTORY_GC, 3600_000 * 24); // every day
  }

  private startRecurring(name: string, nextOccurence: number) {
    const entry = taskRegistry.setRecurring(name, nextOccurence);
    if (!entry || entry.nextOccurence === undefined) {
      console.warn(`attempted to set recurrence on task`, name);
      return;
    }
    const tasks = this.getTasks(true).filter(t => t.name === name);
    if (tasks.length > 0) return; // already scheduled, do nothing
    // only do something if this task has never been scheduled before
    this.in(entry.nextOccurence, name);
  }

  public flushByName(name: string) {
    const tasks = this.getTasks(true).filter(t => t.name === name);
    tasks.forEach(task => {
      const inputs = space.getCell(T, task.id, 'inputs');
      this.flush(task.id, name, inputs);
    });
  }

  public cancel(taskId: string) {
    const name = space.getCell(T, taskId, 'name');
    if (name) {
      const nextOccurence = taskRegistry.getRecurring(name);
      if (nextOccurence > 0) {
        // cancelling recurring tasks should just set the next interval
        this.in(nextOccurence, name);
      }
    }
    space.delRow(T, taskId);
  }

  private flush(taskId: string, name: string, inputs?: AnyObject) {
    const entry = taskRegistry.get(name);
    if (!entry) {
      console.warn('task flushed with no callback', taskId, name);
    } else {
      entry.callback(inputs);
      if (entry.nextOccurence || 0 > 0) {
        this.in(entry.nextOccurence!, name, inputs);
      }
    }
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

  public getCreatedAt(taskId: string) {
    return space.getCell(T, taskId, 'createdAt')!;
  }
}

export const schedule = new TaskScheduler();
