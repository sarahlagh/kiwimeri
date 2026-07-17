import * as UiReact from 'tinybase/ui-react';
import { WithSchemas } from 'tinybase/ui-react/with-schemas';
import { SpaceArchiveType, SpaceType, StoreType } from './store-schema';

export const {
  useCell: useStoreCell,
  useRow: useStoreRow,
  useResultSortedRowIds: useStoreResultSortedRowIds,
  useRowCount: useStoreRowCount,
  useValue: useStoreValue
} = UiReact as typeof UiReact & WithSchemas<StoreType>;

export const {
  useCell: useSpaceCell,
  useRow: useSpaceRow,
  useRowCount: useSpaceRowCount,
  useValue: useSpaceValue,
  useResultSortedRowIds: useSpaceResultSortedRowIds,
  useMetric: useSpaceMetric,
  useCellState: useSpaceCellState
} = UiReact as typeof UiReact & WithSchemas<SpaceType>;

export const { useCell: useSpaceArchiveCell, useRow: useSpaceArchiveRow } =
  UiReact as typeof UiReact & WithSchemas<SpaceArchiveType>;
