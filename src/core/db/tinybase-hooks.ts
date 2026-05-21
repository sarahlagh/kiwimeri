import { Store as UntypedStore } from 'tinybase';
import { CellIdFromSchema } from 'tinybase/@types/_internal/store/with-schemas';
import { Id } from 'tinybase/common';
import * as UiReact from 'tinybase/ui-react';
import { WithSchemas } from 'tinybase/ui-react/with-schemas';
import { space } from './store';
import { SpaceType, StoreType } from './store-schema';
import { TableIdFromSchema } from './types';

export const {
  useCell: useTypedStoreCell,
  useRow: useTypedStoreRow,
  useTable: useTypedStoreTable,
  useResultSortedRowIds: useTypedStoreResultSortedRowIds,
  useRowCount: useTypedStoreRowCount
} = UiReact as typeof UiReact & WithSchemas<StoreType>;

export const {
  useCell: useTypedSpaceCell,
  useRow: useTypedSpaceRow,
  useTable: useTypedSpaceTable,
  useResultSortedRowIds: useTypedSpaceResultSortedRowIds,
  useMetric: useTypedSpaceMetric
} = UiReact as typeof UiReact & WithSchemas<SpaceType>;

// after refacto shouldn't be needed
export const useSpaceCell = <
  RootTableId extends TableIdFromSchema<SpaceType[0]>,
  CellId extends CellIdFromSchema<SpaceType[0], RootTableId>
>(
  tableId: TableIdFromSchema<SpaceType[0]>,
  rowId: Id,
  cellId: CellId
) =>
  useTypedSpaceCell(tableId, rowId, cellId, space as unknown as UntypedStore);
