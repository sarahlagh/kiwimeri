import collectionService from '@/domain/collection/collection.service';
import { writer } from '@/domain/document-edits/document-edits.service';
import { schedule } from './scheduler.service';

export enum TaskNames {
  FAST_WRITE = 'fast_write',
  FAST_WRITE_META_UPDATE = 'meta_update'
}

export function registerGlobalTasks() {
  schedule.register(TaskNames.FAST_WRITE_META_UPDATE, inputs => {
    const { rowId } = inputs!;
    collectionService.setItemField(
      rowId,
      'content',
      collectionService.getDocumentContent(rowId),
      false,
      true
    );
  });

  schedule.register(TaskNames.FAST_WRITE, inputs => {
    const { on, rowId } = inputs!;
    const content = writer.reconcile(on, rowId);
    collectionService.setItemField(rowId, 'content', content, false, false);
    // TODO also save selection!
  });
}
