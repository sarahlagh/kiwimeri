import { space, spaceQueries, storeQueries } from '@/core/db/store';
import { StoreId } from '@/core/db/store-constants';
import { Queries } from 'tinybase/queries';
import { Store } from 'tinybase/store';
import {
  useCell,
  useResultSortedRowIds,
  useResultTable,
  useRow,
  useTable,
  useValue
} from 'tinybase/ui-react';
import { Id } from 'tinybase/with-schemas';

function getStore(storeId: string) {
  switch (storeId) {
    case 'store':
      return store;
    case 'space':
    default:
      return space;
  }
}
function getQueries(storeId: string) {
  switch (storeId) {
    case 'store':
      return storeQueries;
    case 'space':
    default:
      return spaceQueries;
  }
}

const store = (storeId: StoreId) => {
  return getStore(storeId) as unknown as Store;
};

const queries = (storeId: StoreId) => {
  return getQueries(storeId) as unknown as Queries;
};

// override common hooks

export const useValueWithRef = <T>(storeId: StoreId, valueId: Id) => {
  const val = useValue(valueId, store(storeId))?.valueOf();
  if (val !== undefined) {
    return val as T;
  }
  return undefined;
};

export const useCellWithRef = <T>(
  storeId: StoreId,
  tableId: Id,
  rowId: Id,
  cellId: Id
) => {
  const prim = useCell(tableId, rowId, cellId, store(storeId))?.valueOf();
  if (prim) {
    return prim as T;
  }
  return undefined;
};

export const useRowWithRef = <T>(storeId: StoreId, tableId: Id, rowId: Id) => {
  const prim = useRow(tableId, rowId, store(storeId))?.valueOf();
  if (prim) {
    return prim as T;
  }
  return undefined;
};

/** @deprecated let's avoid this at all cost */
export const useTableWithRef = (storeId: StoreId, tableId: Id) => {
  return useTable(tableId, store(storeId));
};

export const useResultTableWithRef = (storeId: StoreId, queryId: Id) => {
  return useResultTable(queryId, queries(storeId));
};

export const useResultSortedRowIdsWithRef = (
  storeId: StoreId,
  queryId: Id,
  cellId?: Id,
  descending?: boolean,
  offset?: number,
  limit?: number
) => {
  return useResultSortedRowIds(
    queryId,
    cellId,
    descending,
    offset,
    limit,
    queries(storeId)
  );
};
