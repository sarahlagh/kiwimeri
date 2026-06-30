import { ROOT_COLLECTION } from '@/constants';
import { useQueryResults } from '@/core/db/queries-helper';
import { CollectionItemType } from '@/domain/collection/collection';
import { CollectionItemSort } from '@/domain/collection/collection-settings';
import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import useGenericQuery from '@/shared/hooks/useGenericQuery';

export default function useNotebooks(
  parentId?: string,
  sort?: CollectionItemSort
) {
  if (!sort) {
    sort = { by: 'order', descending: false };
  }
  const notebooksQuery = useGenericQuery(fetchItemsQuery, {
    parentId: parentId || ROOT_COLLECTION,
    restrictType: CollectionItemType.notebook
  });
  return useQueryResults(notebooksQuery, sort.by, sort.descending);
}
