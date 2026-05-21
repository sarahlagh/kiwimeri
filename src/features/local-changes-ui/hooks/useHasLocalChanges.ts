import { store } from '@/core/db/store';
import { useTypedStoreRowCount } from '@/core/db/tinybase-hooks';

export default function useHasLocalChanges() {
  return useTypedStoreRowCount('localChanges', store) > 0;
}
