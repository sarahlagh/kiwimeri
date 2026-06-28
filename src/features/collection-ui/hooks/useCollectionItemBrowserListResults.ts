import { useQueryResults } from '@/core/db/queries-helper';
import notebooksService from '@/db/notebooks.service';
import { settingsService } from '@/domain/collection-settings/collection-settings.service';
import { CollectionItemSort } from '@/domain/collection-settings/model';
import { CollectionItemResult } from '@/domain/collection/model';
import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import { useEffect } from 'react';

export const browserModes = ['browser', 'updatedAt', 'lastOpenedAt'] as const;
export type BrowserQueryMode = (typeof browserModes)[number] | 'conflicts';

/** use only for the CollectionItemBrowserList component */
export default function useCollectionItemBrowserListResults(
  mode: BrowserQueryMode,
  parent?: string,
  userSort?: CollectionItemSort,
  limit?: number
): CollectionItemResult[] {
  useEffect(() => {
    const notebook = notebooksService.getCurrentNotebook();
    let opts;
    if (mode === 'browser') {
      opts = {
        parentId: parent || notebook,
        recursive: false,
        onlyDocuments: false,
        onlyConflicts: false
      };
    } else {
      opts = {
        parentId: notebook,
        recursive: true,
        onlyDocuments: true,
        onlyConflicts: mode === 'conflicts'
      };
    }
    fetchItemsQuery.loadParams(opts);
  }, [mode, parent]);

  let sort;
  //   let limit;
  if (mode === 'browser' || mode === 'conflicts') {
    sort = userSort;
    if (!sort) {
      sort = settingsService.getNotebookDefaultSort(); // should use hook
    }
  } else {
    sort = { by: mode, descending: true };
    limit = 20;
  }

  return useQueryResults(fetchItemsQuery, sort.by, sort.descending, 0, limit);
}
