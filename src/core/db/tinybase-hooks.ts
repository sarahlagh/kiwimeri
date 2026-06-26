import * as UiReact from 'tinybase/ui-react';
import { WithSchemas } from 'tinybase/ui-react/with-schemas';
import { SpaceType, StoreType } from './store-schema';

export const {
  useCell: useStoreCell,
  useRow: useStoreRow,
  useTable: useStoreTable,
  useResultSortedRowIds: useStoreResultSortedRowIds,
  useRowCount: useStoreRowCount,
  useValue: useStoreValue
} = UiReact as typeof UiReact & WithSchemas<StoreType>;

export const {
  useCell: useSpaceCell,
  useRow: useSpaceRow,
  useRowCount: useSpaceRowCount,
  useTable: useSpaceTable,
  useValue: useSpaceValue,
  useResultSortedRowIds: useSpaceResultSortedRowIds,
  useMetric: useSpaceMetric,
  useCellState: useSpaceCellState
} = UiReact as typeof UiReact & WithSchemas<SpaceType>;
