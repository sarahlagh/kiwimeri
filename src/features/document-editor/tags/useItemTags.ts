import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceCell } from '@/core/db/tinybase-hooks';
import { Id } from 'tinybase/with-schemas';

export default function useItemTags(rowId: Id) {
  const tags = useSpaceCell(SpaceTables.Collection, rowId, 'tags') as string[];
  return new Set(tags !== undefined ? tags.filter(t => t.length > 0) : []);
}
