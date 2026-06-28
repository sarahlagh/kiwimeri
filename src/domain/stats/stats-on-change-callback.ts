import { ROOT_COLLECTION } from '@/constants';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { MetaField } from '@/core/db/types';
import { settingsService } from '../collection-settings/collection-settings.service';
import { statsService } from './stats-service';

export function statsOnPlainTextCallback(rowId: string, plainText: string) {
  const parentId = space.getCell(SpaceTables.Collection, rowId, 'parentId')!;
  const breadcrumb = space.getCell(
    SpaceTables.DerivedState,
    parentId,
    'shortPath'
  ) as string[];
  if (parentId === ROOT_COLLECTION) return; // mostly for tests, no document is supposed to be under root
  if (!breadcrumb || breadcrumb.length === 0)
    throw new Error('undefined ancestry: ' + rowId);
  const notebook = breadcrumb[0];

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
