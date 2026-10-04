import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceRowCount } from '@/core/db/ui-hooks';

export default function useHasLocalChanges() {
  const rowCount = useSpaceRowCount(SpaceTables.LocalChanges);
  return rowCount > 0;
}
