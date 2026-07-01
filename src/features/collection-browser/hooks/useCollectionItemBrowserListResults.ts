import { useQueryResults } from '@/core/db/queries-helper';
import {
  CollectionItemResult,
  CollectionItemType
} from '@/domain/collection/collection';
import { CollectionItemSort } from '@/domain/collection/collection-settings';
import { settingsService } from '@/domain/collection/collection-settings.service';
import notebooksService from '@/domain/collection/notebooks.service';
import { useEffect } from 'react';
import fetchSortableItemsQuery from '../queries/fetchSortableItemsQuery';

export const browserModes = ['browser', 'updatedAt', 'lastOpenedAt'] as const;
export type BrowserQueryMode = (typeof browserModes)[number] | 'conflicts';

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
    fetchSortableItemsQuery.loadParams(opts);
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

  return useQueryResults(
    fetchSortableItemsQuery,
    sort.by,
    sort.descending,
    0,
    limit
  );
}
