import { TinybaseQueryDefinition } from '@/core/db/queries-helper';
import { TableIdFromSchema, WithId } from '@/core/db/types';
import { useEffect } from 'react';
import { OptionalSchemas, ParamValues } from 'tinybase/with-schemas';

const useLoadQuery = <
  Schema extends OptionalSchemas,
  RootTableId extends TableIdFromSchema<Schema[0]>,
  ParamDef extends ParamValues,
  QueryResult extends WithId<unknown>
>(
  query: TinybaseQueryDefinition<Schema, RootTableId, ParamDef, QueryResult>,
  initialParams?: ParamDef
) => {
  useEffect(() => {
    return () => {
      query.close();
    };
  }, []);
  useEffect(() => {
    if (initialParams) {
      query.loadParams(initialParams);
    }
  }, [initialParams]);
  return query;
};

export default useLoadQuery;
