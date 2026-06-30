import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import useGenericQuery from '@/shared/hooks/useGenericQuery';
import { CollectionItemType } from '../collection';

export default function useFetchItemsQuery(
  parent: string,
  restrictTypes?: CollectionItemType[]
) {
  return useGenericQuery(fetchItemsQuery, {
    parentId: parent,
    restrictTypes
  });
}
