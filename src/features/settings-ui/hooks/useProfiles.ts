import { SID, StoreTables } from '@/core/db/store-constants';
import { useStoreRowIds } from '@/core/db/ui-hooks';

export default function useProfiles() {
  const userDefinedProfiles = useStoreRowIds(StoreTables.Profiles, SID.store);
  return ['default', ...userDefinedProfiles];
}
