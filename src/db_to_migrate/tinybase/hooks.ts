import { space } from '@/core/db/store';
import { StoreId } from '@/core/db/store-constants';
import { Store } from 'tinybase/store';
import { useCell } from 'tinybase/ui-react';
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

const store = (storeId: StoreId) => {
  return getStore(storeId) as unknown as Store;
};

// override common hooks

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
