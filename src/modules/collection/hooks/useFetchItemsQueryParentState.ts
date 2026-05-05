import useGenericQueryParamsState from '@/core/hooks/useGenericQueryParamsState';
import { FetchItemsQueryParam } from '@/core/queries/fetchItemsQuery';
import {
  TableIdFromSchema,
  TinybaseQueryDefinition
} from '@/core/queries/queries-helper';
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
