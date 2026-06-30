import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { useSpaceValue } from '@/core/db/tinybase-hooks';

export default function useCurrentNotebook() {
  return (
    useSpaceValue<'currentNotebook'>('currentNotebook') || DEFAULT_NOTEBOOK_ID
  );
}
