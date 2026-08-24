import { space, spaceArchive, spaceDocContent } from '@/core/db/store';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';
import notebooksService from '@/domain/collection/notebooks.service';
import localChangesService from '@/domain/synchronization/local-changes.service';
import tagsService from '../collection/tags.service';
import { storageMergeService } from './storage-merge.service';
import { AfterMergeChange, SpacePortableData } from './types';

class StorageService {
  public getSpaceRepresentation(schemaVersion?: number): SpacePortableData {
    return storageMergeService.getSpaceRepresentation(schemaVersion);
  }

  public nukeSpace() {
    space.setContent([{}, {}]);
    spaceDocContent.setContent([{}, {}]);
    spaceArchive.setContent([{}, {}]);
    notebooksService.initNotebooks();
    localChangesService.clear();
    tagsService.clear();
  }

  public exportJson(withHistory: boolean) {
    schedule.flushByName(TaskNames.FAST_WRITE);
    return storageMergeService.exportJson(withHistory);
  }

  /// from restore button
  public restoreJson(content: string) {
    schedule.flushByName(TaskNames.FAST_WRITE);
    return storageMergeService.restoreJson(content);
  }

  /// from synchronizer
  public restoreContent(
    content: SpacePortableData,
    changes: AfterMergeChange[]
  ) {
    return storageMergeService.restoreContent(content, changes);
  }

  public afterMergeChanges(
    newLocalContent: SpacePortableData,
    localContent: SpacePortableData
  ) {
    return storageMergeService.afterMergeChanges(newLocalContent, localContent);
  }
}

export const storageService = new StorageService();
