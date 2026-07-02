import { useQueryResults } from '@/core/db/queries-helper';
import { CollectionItemType } from '@/domain/collection/collection';
import { settingsService } from '@/domain/collection/collection-settings.service';
import notebooksService from '@/domain/collection/notebooks.service';
import { useEffect } from 'react';
import {
  BrowsableItemResult,
  BrowsableItemSort,
  fromCollectionItemSort
} from '../browsable-item';
import fetchBrowsableItemsQuery from '../queries/fetchBrowsableItemsQuery';

export const browserModes = [
  'browser',
  'updatedAtRank',
  'lastOpenedAtRank'
] as const;
export type BrowserQueryMode = (typeof browserModes)[number] | 'conflicts';

export default function useCollectionItemBrowserListResults(
  mode: BrowserQueryMode,
  parent?: string,
  userSort?: BrowsableItemSort,
  limit?: number
): BrowsableItemResult[] {
  useEffect(() => {
    const notebook = notebooksService.getCurrentNotebook();
    let opts;
    if (mode === 'browser') {
      opts = {
        parentId: parent || notebook,
        recursive: false,
        onlyConflicts: false
      };
    } else {
      opts = {
        parentId: notebook,
        recursive: true,
        restrictType: CollectionItemType.document,
        onlyConflicts: mode === 'conflicts'
      };
    }
    fetchBrowsableItemsQuery.loadParams(opts);
  }, [mode, parent]);

  let sort: BrowsableItemSort;
  //   let limit;
  if (mode === 'browser' || mode === 'conflicts') {
    if (userSort) {
      sort = userSort;
    } else {
      sort = fromCollectionItemSort(settingsService.getNotebookDefaultSort());
    }
  } else {
    sort = { by: mode, descending: true };
    limit = 20;
  }

  return useQueryResults(
    fetchBrowsableItemsQuery,
    sort.by,
    sort.descending,
    0,
    limit
  );
}
