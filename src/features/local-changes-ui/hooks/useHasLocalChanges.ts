import { store } from '@/core/db/store';
import { useStoreRowCount } from '@/core/db/tinybase-hooks';
import { useEffect, useState } from 'react';

export default function useHasLocalChanges() {
  const [hasAnyRow, setHasAnyRow] = useState(false);
  const rowCount = useStoreRowCount('localChanges', store);
  useEffect(() => {
    setHasAnyRow(rowCount > 0);
  }, [rowCount]);
  return hasAnyRow;
}
