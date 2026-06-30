import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import useGenericQuery from '@/shared/hooks/useGenericQuery';
import { Id } from 'tinybase';
import { CollectionItemType } from '../collection';

export default function useFetchItemsQuery(
  querySuffix: Id,
  parent: string,
  restrictTypes?: CollectionItemType[]
) {
  return useGenericQuery(querySuffix, fetchItemsQuery, {
    parentId: parent,
    restrictTypes
  });
}
