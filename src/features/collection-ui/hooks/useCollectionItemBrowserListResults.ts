import {
  CollectionItemResult,
  CollectionItemSort
} from '@/collection/collection';
import { useQueryResults } from '@/core/db/queries-helper';
import notebooksService from '@/db/notebooks.service';
import userSettingsService from '@/db/user-settings.service';
import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import { useEffect } from 'react';

export const browserModes = ['browser', 'updated', 'lastOpenedAt'] as const;
export type BrowserQueryMode = (typeof browserModes)[number];

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
        parent: parent || notebook,
        recursive: false,
        onlyDocuments: false
      };
    } else {
      opts = { parent: notebook, recursive: true, onlyDocuments: true };
    }
    fetchItemsQuery.loadParams(opts);
  }, [mode, parent]);

  let sort;
  //   let limit;
  if (mode === 'browser') {
    sort = userSort;
    if (!sort) {
      sort = userSettingsService.getDefaultDisplayOpts().sort; // should use hook
    }
  } else {
    sort = { by: mode, descending: true };
    limit = 20;
  }

  return useQueryResults(fetchItemsQuery, sort.by, sort.descending, 0, limit);
}
