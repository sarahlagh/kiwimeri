import collectionService from '@/domain/collection/collection.service';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import { writer } from '@/domain/document-edits/document-edits.service';
import { SpaceTables } from '../db/store-constants';
import { AnyData } from '../db/types';
import { appLog } from '../logs/logs.service';

export enum TaskNames {
  FAST_WRITE = 'fast_write',
  LOG_GC = 'log_gc'
}

export type TaskCallback = (inputs?: AnyData) => void;
export type RegistryEntry = {
  callback: TaskCallback;
  nextOccurence?: number;
};

class TaskRegistry {
  private registry = new Map<string, RegistryEntry>();

  public init() {
    this.register(TaskNames.FAST_WRITE, inputs => {
      const { on, rowId } = inputs!;
      const content = writer.reconcile(on, rowId);
      if (on === SpaceTables.Collection) {
        collectionService.setItemField(rowId, 'content', content, false);
      } else {
        annotsService.edit(rowId, content);
      }
    });

    this.register(TaskNames.LOG_GC, () => {
      appLog.gc();
    });
  }

  public get(name: string) {
    return this.registry.get(name);
  }

  public setRecurring(name: string, nextOccurence: number) {
    const entry = this.registry.get(name);
    if (!entry)
      throw new Error(
        `attempting to set recurrence on unregistered task ${name}`
      );
    entry.nextOccurence = nextOccurence;
    return entry;
  }

  public getRecurring(name: string) {
    const entry = this.registry.get(name);
    return entry?.nextOccurence || 0;
  }

  private register(name: string, callback: TaskCallback) {
    this.registry.set(name, {
      callback
    });
  }
}

export const taskRegistry = new TaskRegistry();
