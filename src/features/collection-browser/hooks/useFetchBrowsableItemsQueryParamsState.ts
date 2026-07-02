import { TinybaseQueryDefinition } from '@/core/db/queries-helper';
import { TableIdFromSchema, WithId } from '@/core/db/types';
import { CollectionItemTypeValues } from '@/domain/collection/collection';
import useGenericQueryParamsState from '@/shared/hooks/useGenericQueryParamsState';
import { OptionalSchemas } from 'tinybase/with-schemas';
import { fetchBrowsableItemsQueryParam } from '../queries/fetchBrowsableItemsQuery';

export default function useFetchBrowsableItemsQueryParamsState<
  Schema extends OptionalSchemas,
  RootTableId extends TableIdFromSchema<Schema[0]>,
  QueryResult extends WithId<unknown>
>(
  query: TinybaseQueryDefinition<
    Schema,
    RootTableId,
    fetchBrowsableItemsQueryParam,
    QueryResult
  >,
  restrictTypes?: CollectionItemTypeValues[]
): [string, (p: string) => void] {
  const [params, setParams] = useGenericQueryParamsState(query);
  const setParent = (parent: string) => {
    setParams({
      parentId: parent,
      recursive: false,
      onlyConflicts: false,
      restrictTypes
    });
  };

  return [params.parentId, setParent];
}
