import collectionService from '@/domain/collection/collection.service';
import { writer } from '@/domain/document-edits/document-edits.service';
import { schedule } from './scheduler.service';

export enum TaskNames {
  FAST_WRITE = 'fast_write'
}

export function registerGlobalTasks() {
  schedule.register(TaskNames.FAST_WRITE, inputs => {
    const { on, rowId } = inputs!;
    const content = writer.reconcile(on, rowId);
    collectionService.setItemField(rowId, 'content', content, false);
    // TODO also save selection!
  });
}
