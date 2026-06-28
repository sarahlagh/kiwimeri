import { TinybaseQueryDefinition } from '@/core/db/queries-helper';
import { TableIdFromSchema, WithId } from '@/core/db/types';
import { useEffect, useState } from 'react';
import { OptionalSchemas, ParamValues } from 'tinybase/with-schemas';

const useGenericQuery = <
  Schema extends OptionalSchemas,
  RootTableId extends TableIdFromSchema<Schema[0]>,
  ParamDef extends ParamValues,
  QueryResult extends WithId<unknown>
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
