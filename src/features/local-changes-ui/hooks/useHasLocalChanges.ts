import { store } from '@/core/db/store';
import { useStoreRowCount } from '@/core/db/tinybase-hooks';

export default function useHasLocalChanges() {
  return useStoreRowCount('localChanges', store) > 0;
}
