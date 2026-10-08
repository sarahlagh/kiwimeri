import { useQueryResults } from '@/core/db/queries-helper';
import { CollectionItemType } from '@/domain/collection/collection';
import { settingsService } from '@/domain/collection/collection-settings.service';
import notebooksService from '@/domain/collection/notebooks.service';
import { conflictsService } from '@/domain/space-merging/conflicts.service';
import fetchAnnotsConflictsQuery from '@/domain/space-merging/queries/fetchAnnotsConflictsQuery';
import fetchItemsConflictsQuery from '@/domain/space-merging/queries/fetchItemsConflictsQuery';
import { useEffect } from 'react';
import { BrowsableItemResult, BrowsableItemSort } from '../browsable-item';
import fetchBrowsableItemsQuery from '../queries/fetchBrowsableItemsQuery';

export const browserModes = ['browser', 'updatedAt', 'lastOpenedAt'] as const;
export type BrowserQueryMode = (typeof browserModes)[number] | 'conflicts';

export default function useCollectionItemBrowserListResults(
  mode: BrowserQueryMode,
  parent?: string,
  userSort?: BrowsableItemSort,
  limit?: number
): BrowsableItemResult[] {
  const itemsConflicts = useQueryResults(fetchItemsConflictsQuery);
  const annotsConflicts = useQueryResults(fetchAnnotsConflictsQuery);
  useEffect(() => {
    const notebook = notebooksService.getCurrentNotebook();
    let opts;
    if (mode === 'browser') {
      opts = {
        parentId: parent || notebook,
        recursive: false
      };
    } else {
      const inputs = conflictsService.conflictsToQueryInputs(
        itemsConflicts,
        annotsConflicts
      );
      opts = {
        parentId: notebook,
        recursive: true,
        restrictType: CollectionItemType.document,
        itemsConflicts:
          mode === 'conflicts' ? inputs.itemsConflicts : undefined,
        annotsConflicts:
          mode === 'conflicts' ? inputs.annotsConflicts : undefined,
        withLastOpenedAt: mode === 'lastOpenedAt'
      };
    }
    fetchBrowsableItemsQuery.loadParams(opts);
  }, [mode, parent, itemsConflicts, annotsConflicts]);

  let sort: BrowsableItemSort;
  //   let limit;
  if (mode === 'browser' || mode === 'conflicts') {
    if (userSort) {
      sort = userSort;
    } else {
      sort = settingsService.getNotebookDefaultSort();
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
