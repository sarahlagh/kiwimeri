import { SID, SpaceTables } from '@/core/db/store-constants';
import { useSpaceRowCount } from '@/core/db/tinybase-hooks';
import { useEffect, useState } from 'react';

export default function useHasLocalChanges() {
  const [hasAnyRow, setHasAnyRow] = useState(false);
  const rowCount = useSpaceRowCount(SpaceTables.LocalChanges, SID.space);
  useEffect(() => {
    setHasAnyRow(rowCount > 0);
  }, [rowCount]);
  return hasAnyRow;
}
