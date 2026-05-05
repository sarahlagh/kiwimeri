import {
  TableIdFromSchema,
  TinybaseQueryDefinition
} from '@/core/queries/queries-helper';
import { Queries as UntypedQueries } from 'tinybase';
import { useParamValuesState } from 'tinybase/ui-react';
import { OptionalSchemas, ParamValues } from 'tinybase/with-schemas';

const useGenericQueryParamsState = <
  Schema extends OptionalSchemas,
  RootTableId extends TableIdFromSchema<Schema[0]>,
  ParamDef extends ParamValues,
  QueryResult
>(
  query: TinybaseQueryDefinition<Schema, RootTableId, ParamDef, QueryResult>
): [ParamDef, (p: ParamDef) => void] => {
  const [params, setParams] = useParamValuesState(
    query.queryId,
    query.queries as unknown as UntypedQueries
  );
  return [params as ParamDef, setParams as (params: ParamDef) => void];
};

export default useGenericQueryParamsState;
