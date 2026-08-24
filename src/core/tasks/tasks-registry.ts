import collectionService from '@/domain/collection/collection.service';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import { writer } from '@/domain/document-edits/document-edits.service';
import { SpaceTables } from '../db/store-constants';
import { schedule } from './scheduler.service';

export enum TaskNames {
  FAST_WRITE = 'fast_write'
}

export function registerGlobalTasks() {
  schedule.register(TaskNames.FAST_WRITE, inputs => {
    const { on, rowId } = inputs!;
    const content = writer.reconcile(on, rowId);
    if (on === SpaceTables.Collection) {
      collectionService.setItemField(rowId, 'content', content, false);
    } else {
      annotsService.edit(rowId, content);
    }
  });
}
