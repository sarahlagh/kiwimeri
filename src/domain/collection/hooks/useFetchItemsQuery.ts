import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import useGenericQuery from '@/shared/hooks/useGenericQuery';

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
