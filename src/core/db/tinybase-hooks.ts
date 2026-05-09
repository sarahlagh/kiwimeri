import { SpaceType } from '@/db/types/space-types';
import { StoreType } from '@/db/types/store-types';
import { Id } from 'tinybase/common';
import { Store as UntypedStore } from 'tinybase/store';
import * as UiReact from 'tinybase/ui-react';
import { WithSchemas } from 'tinybase/ui-react/with-schemas';
import { getSpace, getStore } from './store';

const {
  useCell: useTypedStoreCell,
  useRow: useTypedStoreRow,
  useTable: useTypedStoreTable,
  useResultSortedRowIds: useTypedStoreResultSortedRowIds
} = UiReact as typeof UiReact & WithSchemas<StoreType>;

const {
  useCell: useTypedSpaceCell,
  useRow: useTypedSpaceRow,
  useTable: useTypedSpaceTable,
  useResultSortedRowIds: useTypedSpaceResultSortedRowIds
} = UiReact as typeof UiReact & WithSchemas<SpaceType>;

export const useStoreCell = (tableId: string, rowId: string, cellId: string) =>
  useTypedStoreCell(
    tableId,
    rowId,
    cellId,
    getStore() as unknown as UntypedStore
  );
export const useSpaceCell = (tableId: string, rowId: string, cellId: string) =>
  useTypedSpaceCell(
    tableId,
    rowId,
    cellId,
    getSpace() as unknown as UntypedStore
  );

export const useStoreRow = (tableId: string, rowId: string) =>
  useTypedStoreRow(tableId, rowId, getStore() as unknown as UntypedStore);
export const useSpaceRow = (tableId: string, rowId: string) =>
  useTypedSpaceRow(tableId, rowId, getSpace() as unknown as UntypedStore);

export const useStoreTable = (tableId: string) =>
  useTypedStoreTable(tableId, getStore() as unknown as UntypedStore);
export const useSpaceTable = (tableId: string) =>
  useTypedSpaceTable(tableId, getSpace() as unknown as UntypedStore);

export const useStoreResultSortedRowIds = (
  queryId: Id,
  cellId?: Id,
  descending?: boolean,
  offset?: number,
  limit?: number
) =>
  useTypedStoreResultSortedRowIds(
    queryId,
    cellId,
    descending,
    offset,
    limit,
    'store'
  );

export const useSpaceResultSortedRowIds = (
  queryId: Id,
  cellId?: Id,
  descending?: boolean,
  offset?: number,
  limit?: number
) =>
  useTypedSpaceResultSortedRowIds(
    queryId,
    cellId,
    descending,
    offset,
    limit,
    'space'
  );
