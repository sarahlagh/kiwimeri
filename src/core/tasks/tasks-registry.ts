import collectionService from '@/domain/collection/collection.service';
import { schedule } from './scheduler.service';

export enum TaskNames {
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
}
