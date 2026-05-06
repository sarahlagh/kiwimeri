import { useEffect, useState } from 'react';
import { OptionalSchemas, ParamValues } from 'tinybase/with-schemas';
import {
  TableIdFromSchema,
  TinybaseQueryDefinition
} from '../../core/db/queries-helper';

const useGenericQuery = <
  Schema extends OptionalSchemas,
  RootTableId extends TableIdFromSchema<Schema[0]>,
  ParamDef extends ParamValues,
  QueryResult
>(
  initialQuery: TinybaseQueryDefinition<
    Schema,
    RootTableId,
    ParamDef,
    QueryResult
  >,
  initialParams?: ParamDef
) => {
  const [query] = useState(initialQuery.clone());
  useEffect(() => {
    if (initialParams) {
      query.loadParams(initialParams);
    }
    return () => {
      query.close();
    };
  }, []);
  return query;
};

export default useGenericQuery;
