import { CollectionItemType } from '@/domain/collection/collection';
import useGenericQueryInstance from '@/shared/hooks/useGenericQueryInstance';
import { Id } from 'tinybase';
import fetchSortableItemsQuery from '../queries/fetchSortableItemsQuery';

export default function useFetchItemsQuery(
  querySuffix: Id,
  parent: string,
  restrictTypes?: CollectionItemType[]
) {
  return useGenericQueryInstance(querySuffix, fetchSortableItemsQuery, {
    parentId: parent,
    restrictTypes
  });
}
