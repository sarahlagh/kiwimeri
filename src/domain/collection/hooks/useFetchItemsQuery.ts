import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import useGenericQueryInstance from '@/shared/hooks/useGenericQueryInstance';
import { Id } from 'tinybase';
import { CollectionItemType } from '../collection';

export default function useFetchItemsQuery(
  querySuffix: Id,
  parent: string,
  restrictTypes?: CollectionItemType[]
) {
  return useGenericQueryInstance(querySuffix, fetchItemsQuery, {
    parentId: parent,
    restrictTypes
  });
}
