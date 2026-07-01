import useHasLocalChanges from './useHasLocalChanges';
import useHasLocalConflicts from './useHasLocalConflicts';
import useIsPrimaryConnected from './useIsPrimaryConnected';
import usePrimaryHasRemoteChanges from './usePrimaryHasRemoteChanges';

export default function useSynchronizationStates() {
  const isPrimaryConnected = useIsPrimaryConnected();
  const hasChanges = useHasLocalChanges();
  const hasRemoteChanges = usePrimaryHasRemoteChanges();
  const hasConflicts = useHasLocalConflicts();
  const isSyncEnabled = isPrimaryConnected && !hasConflicts;
  return {
    isPrimaryConnected,
    hasChanges,
    hasRemoteChanges,
    hasConflicts,
    isSyncEnabled
  };
}
