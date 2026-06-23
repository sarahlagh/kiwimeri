import { space, store } from '@/core/db/store';
import { SpaceTables, StoreTables } from '@/core/db/store-constants';
import { MetaField } from '@/core/db/types';
import { settingsService } from '../collection-settings/collection-settings.service';
import { statsService } from './stats-service';

export function statsOnPlainTextCallback(rowId: string, plainText: string) {
  const parentId = space.getCell(SpaceTables.Collection, rowId, 'parent')!;
  const breadcrumb =
    store.getCell(StoreTables.Search, parentId, 'breadcrumb')?.toString() || '';
  let notebook = breadcrumb.split(',')[0];
  if (notebook.length === 0) notebook = parentId;

  if (settingsService.getNotebookDefaultStatsEnabled(notebook) && plainText) {
    // stats
    const content_meta = space.getCell(
      SpaceTables.Collection,
      rowId,
      'content_meta'
    ) as MetaField;
    statsService.updateStatsAtDate(
      rowId,
      statsService.buildStatsFromContentMeta(plainText, content_meta)
    );
  }
}
