import { conflictsService } from '@/domain/synchronization/conflicts-service';
import { useHasLocalChanges } from '@/features/local-changes-ui';
import useIsPrimaryConnected from './useIsPrimaryConnected';
import usePrimaryHasRemoteChanges from './usePrimaryHasRemoteChanges';

export default function useSynchronizationStates() {
  const isPrimaryConnected = useIsPrimaryConnected();
  const hasChanges = useHasLocalChanges();
  const hasRemoteChanges = usePrimaryHasRemoteChanges();
  const hasConflicts = conflictsService.useHasLocalConflicts();
  const isSyncEnabled = isPrimaryConnected && !hasConflicts;
  return {
    isPrimaryConnected,
    hasChanges,
    hasRemoteChanges,
    hasConflicts,
    isSyncEnabled
  };
}
