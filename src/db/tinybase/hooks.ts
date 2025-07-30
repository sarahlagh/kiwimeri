import { Indexes } from 'tinybase/indexes';
import { Queries } from 'tinybase/queries';
import { Store } from 'tinybase/store';
import {
  useCell,
  useResultSortedRowIds,
  useResultTable,
  useSliceRowIds,
  useTable,
  useValue
} from 'tinybase/ui-react';
import { Id } from 'tinybase/with-schemas';
import storageService, { StoreId } from '../storage.service';

const store = (storeId: StoreId) => {
  return storageService.get(storeId) as unknown as Store;
};

const queries = (storeId: StoreId) => {
  return storageService.getQueries(storeId) as unknown as Queries;
};

const indexes = (storeId: StoreId) => {
  return storageService.getIndexes(storeId) as unknown as Indexes;
};

// override common hooks

export const useValueWithRef = <T>(storeId: StoreId, valueId: Id) => {
  const val = useValue(valueId, store(storeId))?.valueOf();
  if (val) {
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

export const useSliceRowIdsWithRef = (
  storeId: StoreId,
  indexId: Id,
  sliceId: Id
) => {
  return useSliceRowIds(indexId, sliceId, indexes(storeId));
};
