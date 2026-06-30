import { ROOT_COLLECTION } from '@/constants';
import { CollectionItemType } from '@/domain/collection/collection';
import fetchItemsQuery from '@/domain/collection/queries/fetchItemsQuery';
import useGenericQuery from '@/shared/hooks/useGenericQuery';
import { Id } from 'tinybase/with-schemas';

export default function useNotebooksQuery(querySuffix: Id, parentId?: string) {
  return useGenericQuery(querySuffix, fetchItemsQuery, {
    parentId: parentId || ROOT_COLLECTION,
    restrictType: CollectionItemType.notebook
  });
}
