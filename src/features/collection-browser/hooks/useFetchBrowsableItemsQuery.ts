import { CollectionItemType } from '@/domain/collection/collection';
import useGenericQueryInstance from '@/shared/hooks/useGenericQueryInstance';
import { Id } from 'tinybase';
import fetchBrowsableItemsQuery from '../queries/fetchBrowsableItemsQuery';

export default function useFetchBrowsableItemsQuery(
  querySuffix: Id,
  parent: string,
  restrictTypes?: CollectionItemType[]
) {
  return useGenericQueryInstance(querySuffix, fetchBrowsableItemsQuery, {
    parentId: parent,
    restrictTypes
  });
}
