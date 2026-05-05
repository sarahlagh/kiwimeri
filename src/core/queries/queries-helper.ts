import storageService from '@/db/storage.service';
import { useResultSortedRowIdsWithRef } from '@/db/tinybase/hooks';
import { SpaceType } from '@/db/types/space-types';
import { StoreType } from '@/db/types/store-types';
import {
  getUniqueId,
  Group,
  Having,
  Id,
  Join,
  OptionalSchemas,
  OptionalTablesSchema,
  Param,
  ParamValues,
  Queries,
  ResultRow,
  Select,
  Where
} from 'tinybase/with-schemas';

export type AsId<Key> = Exclude<Key & Id, number>;
export type TableIdFromSchema<Schema extends OptionalTablesSchema> = AsId<
  keyof Schema
>;

export type SortCell<T> = AsId<keyof T>;

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
  QueryResult
> {
  constructor(
    public queries: Queries<Schema>,
    public queryId: Id,
    protected tableId: RootTableId,
    protected query: QueryDefinition<Schema, RootTableId>
  ) {}

  /** load a permanent query definition, for use in hooks */
  public loadParams(paramValues: ParamDef) {
    // const queries = this.getQueries();
    if (!this.queries.hasQuery(this.queryId)) {
      this.queries.setQueryDefinition(
        this.queryId,
        this.tableId,
        this.query,
        paramValues
      );
    } else {
      this.queries.setParamValues(this.queryId, paramValues);
    }
    return this;
  }

  /** get results from a permanent query definition, hook version */
  public useResults(
    sortBy?: SortCell<QueryResult>,
    descending?: boolean,
    offset?: number,
    limit?: number
  ) {
    return useResultSortedRowIdsWithRef(
      'space',
      this.queryId,
      sortBy,
      descending,
      offset,
      limit
    ).map(
      rowId =>
        ({
          ...this.queries.getResultRow(this.queryId, rowId),
          id: rowId
        }) as QueryResult & { id: Id }
    );
  }

  /** get results from a query */
  private _getResults(
    sortBy?: SortCell<QueryResult>,
    descending?: boolean,
    offset?: number,
    limit?: number
  ) {
    return this.queries
      .getResultSortedRowIds(this.queryId, sortBy, descending, offset, limit)
      .map(rowId => {
        return {
          ...this.queries.getResultRow(this.queryId, rowId),
          id: rowId
        } as QueryResult & { id: Id };
      });
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
      this.queries,
      `${this.queryId}-${getUniqueId()}`,
      this.tableId,
      this.query
    );
    if (paramValues) {
      copy.loadParams(paramValues);
    }
    return copy;
  }

  public close() {
    this.queries.delQueryDefinition(this.queryId);
  }
}

export class SpaceQueryDefinition<
  ParamDef extends ParamValues,
  QueryResult extends ResultRow,
  RootTableId extends TableIdFromSchema<SpaceType[0]>
> extends TinybaseQueryDefinition<
  SpaceType,
  RootTableId,
  ParamDef,
  QueryResult
> {
  constructor(
    public queryId: Id,
    protected tableId: RootTableId,
    protected query: QueryDefinition<SpaceType, RootTableId>
  ) {
    super(storageService.getSpaceQueries(), queryId, tableId, query);
  }
}

export class StoreQueryDefinition<
  ParamDef extends ParamValues,
  QueryResult extends ResultRow,
  RootTableId extends TableIdFromSchema<StoreType[0]>
> extends TinybaseQueryDefinition<
  StoreType,
  RootTableId,
  ParamDef,
  QueryResult
> {
  constructor(
    public queryId: Id,
    protected tableId: RootTableId,
    protected query: QueryDefinition<StoreType, RootTableId>
  ) {
    super(storageService.getStoreQueries(), queryId, tableId, query);
  }
}
