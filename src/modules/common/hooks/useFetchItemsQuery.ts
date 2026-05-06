import useGenericQuery from '@/core/hooks/useGenericQuery';
import fetchItemsQuery from '@/core/queries/fetchItemsQuery';

export default function useFetchItemsQuery(
  parent: string,
  recursive?: boolean,
  onlyDocuments?: boolean
) {
  return useGenericQuery(fetchItemsQuery, {
    parent,
    onlyDocuments: recursive || false,
    recursive: onlyDocuments || false
  });
}
