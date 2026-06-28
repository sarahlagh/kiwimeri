import { useResultSortedRowIds, useResultTable } from 'tinybase/ui-react';
import {
  getUniqueId,
  Group,
  Having,
  Id,
  Join,
  OptionalSchemas,
  Param,
  ParamValues,
  Queries,
  Select,
  Where
} from 'tinybase/with-schemas';
import { spaceQueries, storeQueries } from './store';
import { StoreId } from './store-constants';
import {
  SpaceTableId,
  SpaceType,
  StoreTableId,
  StoreType
} from './store-schema';
import { AsId, TableIdFromSchema, WithId } from './types';

export type SortCell<T> = Exclude<AsId<keyof T>, 'id'>;
// export type SortCell<T> = AsId<keyof T>;

function getQueries(storeId: StoreId) {
  switch (storeId) {
    case 'store':
      return storeQueries;
    case 'space':
      return spaceQueries;
  }
}

type QueryDefinition<
  Schema extends OptionalSchemas,
  RootTableId extends TableIdFromSchema<Schema[0]>
> = (keywords: {
  select: Select<Schema[0], RootTableId>;
  join: Join<Schema[0], RootTableId>;
  where: Where<Schema[0], RootTableId>;
  group: Group;
  having: Having;
  param: Param;
}) => void;

export class TinybaseQueryDefinition<
  Schema extends OptionalSchemas,
  RootTableId extends TableIdFromSchema<Schema[0]>,
  ParamDef extends ParamValues,
  QueryResult extends WithId<unknown>
> {
  constructor(
    public storeId: StoreId,
    public queryId: Id,
    public tableId: RootTableId,
    public query: QueryDefinition<Schema, RootTableId>,
    public defaultSortBy?: SortCell<QueryResult>,
    public defaultDescending?: boolean
  ) {}

  public initQuery(paramValues?: ParamDef) {
    const queries = this.getQueries() as unknown as Queries<Schema>;
    if (!queries.hasQuery(this.queryId)) {
      queries.setQueryDefinition(
        this.queryId,
        this.tableId,
        this.query,
        paramValues
      );
    }
  }

  /** load a permanent query definition, for use in hooks */
  public loadParams(paramValues: ParamDef) {
    const queries = this.getQueries() as unknown as Queries<Schema>;
    if (!queries.hasQuery(this.queryId)) {
      queries.setQueryDefinition(
        this.queryId,
        this.tableId,
        this.query,
        paramValues
      );
    } else {
      queries.setParamValues(this.queryId, paramValues);
    }
    return this;
  }

  /** get results from a query */
  private _getResults(
    sortBy?: SortCell<QueryResult>,
    descending?: boolean,
    offset?: number,
    limit?: number
  ) {
    if (descending === undefined) descending = this.defaultDescending;
    if (sortBy === undefined) sortBy = this.defaultSortBy;
    const queries = this.getQueries();
    return queries
      .getResultSortedRowIds(this.queryId, sortBy, descending, offset, limit)
      .map(
        rowId =>
          ({
            ...queries.getResultRow(this.queryId, rowId),
            id: rowId
          }) as WithId<QueryResult>
      );
  }

  /** loads a query definition once then delete it after results */
  public getResults(
    paramValues: ParamDef,
    sortBy?: SortCell<QueryResult>,
    descending?: boolean,
    offset?: number,
    limit?: number
  ) {
    const tempQuery = this.clone(paramValues);
    const results = tempQuery._getResults(sortBy, descending, offset, limit);
    tempQuery.close();
    return results;
  }

  public clone(paramValues?: ParamDef) {
    const copy = new TinybaseQueryDefinition<
      Schema,
      RootTableId,
      ParamDef,
      QueryResult
    >(
      this.storeId,
      `${this.queryId}-${getUniqueId()}`,
      this.tableId,
      this.query,
      this.defaultSortBy,
      this.defaultDescending
    );
    copy.initQuery(paramValues);
    return copy;
  }

  public close() {
    this.getQueries().delQueryDefinition(this.queryId);
  }

  public getQueries() {
    return getQueries(this.storeId);
  }
}

export class SpaceQueryDefinition<
  ParamDef extends ParamValues,
  QueryResult extends WithId<unknown>,
  RootTableId extends SpaceTableId
> extends TinybaseQueryDefinition<
  SpaceType,
  RootTableId,
  ParamDef,
  QueryResult
> {
  constructor(
    public queryId: Id,
    public tableId: RootTableId,
    public query: QueryDefinition<SpaceType, RootTableId>,
    public defaultSortBy?: SortCell<QueryResult>,
    public defaultDescending?: boolean
  ) {
    super('space', queryId, tableId, query, defaultSortBy, defaultDescending);
  }
}

export class StoreQueryDefinition<
  ParamDef extends ParamValues,
  QueryResult extends WithId<unknown>,
  RootTableId extends StoreTableId
> extends TinybaseQueryDefinition<
  StoreType,
  RootTableId,
  ParamDef,
  QueryResult
> {
  constructor(
    public queryId: Id,
    public tableId: RootTableId,
    public query: QueryDefinition<StoreType, RootTableId>
  ) {
    super('store', queryId, tableId, query);
  }
}

export const useQueryResults = <
  Schema extends OptionalSchemas,
  RootTableId extends TableIdFromSchema<Schema[0]>,
  ParamDef extends ParamValues,
  QueryResult extends WithId<unknown>
>(
  queryDef: TinybaseQueryDefinition<Schema, RootTableId, ParamDef, QueryResult>,
  sortBy?: SortCell<QueryResult>,
  descending?: boolean,
  offset?: number,
  limit?: number
) => {
  if (descending === undefined) descending = queryDef.defaultDescending;
  if (sortBy === undefined) sortBy = queryDef.defaultSortBy;
  const resultTable = useResultTable(queryDef.queryId, queryDef.storeId);
  return useResultSortedRowIds(
    queryDef.queryId,
    sortBy,
    descending,
    offset,
    limit,
    queryDef.storeId
  ).map(
    rowId =>
      ({
        ...resultTable[rowId],
        id: rowId
      }) as WithId<QueryResult>
  );
};

export const useQueryResultIds = <
  Schema extends OptionalSchemas,
  RootTableId extends TableIdFromSchema<Schema[0]>,
  ParamDef extends ParamValues,
  QueryResult extends WithId<unknown>
>(
  queryDef: TinybaseQueryDefinition<Schema, RootTableId, ParamDef, QueryResult>,
  sortBy?: SortCell<QueryResult>,
  descending?: boolean,
  offset?: number,
  limit?: number
) => {
  if (descending === undefined) descending = queryDef.defaultDescending;
  if (sortBy === undefined) sortBy = queryDef.defaultSortBy;
  return useResultSortedRowIds(
    queryDef.queryId,
    sortBy,
    descending,
    offset,
    limit,
    queryDef.storeId
  );
};
