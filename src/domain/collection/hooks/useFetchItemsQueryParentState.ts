import {
  TableIdFromSchema,
  TinybaseQueryDefinition
} from '@/core/db/queries-helper';
import { FetchItemsQueryParam } from '@/domain/collection/queries/fetchItemsQuery';
import useGenericQueryParamsState from '@/shared/hooks/useGenericQueryParamsState';
import { OptionalSchemas } from 'tinybase/with-schemas';

export default function useFetchItemsQueryParamsState<
  Schema extends OptionalSchemas,
  RootTableId extends TableIdFromSchema<Schema[0]>,
  QueryResult
>(
  query: TinybaseQueryDefinition<
    Schema,
    RootTableId,
    FetchItemsQueryParam,
    QueryResult
  >
): [string, (p: string) => void] {
  const [params, setParams] = useGenericQueryParamsState(query);
  const setParent = (parent: string) => {
    setParams({
      parent,
      onlyDocuments: false,
      recursive: false
    });
  };

  return [params.parent, setParent];
}
