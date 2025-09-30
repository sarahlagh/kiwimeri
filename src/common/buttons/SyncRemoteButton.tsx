import { APPICONS } from '@/constants';
import { SyncDirection, syncService } from '@/remote-storage/sync.service';
import { IonButton, IonIcon } from '@ionic/react';
import { Id } from 'tinybase/with-schemas';
import { useNetworkStatus } from '../context/NetworkStatusContext';
import ConfirmYesNoDialog from '../modals/ConfirmYesNoDialog';

type SyncRemoteButtonProps = {
  direction: SyncDirection;
  remote?: Id;
  disabled?: boolean;
  askConfirm?: boolean;
  color?: string;
  fill?: 'clear' | 'outline' | 'solid' | 'default';
  onSyncStart?: () => void;
  onSyncEnd?: () => void;
  showConflictsWarning?: boolean;
  showRemoteChangesWarning?: boolean;
};

const SyncRemoteButton = ({
  remote,
  direction,
  disabled = false,
  color,
  askConfirm = false,
  fill = 'clear',
  showConflictsWarning = false,
  showRemoteChangesWarning = false,
  onSyncStart,
  onSyncEnd
}: SyncRemoteButtonProps) => {
  const networkStatus = useNetworkStatus();
  const trigger = `sync-${direction}-button-${remote}`;
  const onConfirm = async () => {
    if (onSyncStart) onSyncStart();
    await syncService.sync(direction, remote);
    if (onSyncEnd) onSyncEnd();
  };
  if (!networkStatus?.connected) {
    return (
      <IonButton disabled={true}>
        <IonIcon icon={APPICONS.cloudOffline}></IonIcon>
      </IonButton>
    );
  }

  const getIcon = () => {
    if (direction === 'sync') {
      if (showRemoteChangesWarning) return APPICONS.cloudSyncRemote;
      return APPICONS.cloudSync;
    }
    if (direction === 'pull' || direction === 'force-pull')
      return APPICONS.cloudDownload;
    return APPICONS.cloudUpload;
  };

  return (
    <>
      <IonButton
        id={trigger}
        disabled={disabled || showConflictsWarning}
        color={color}
        fill={fill}
        onClick={askConfirm ? undefined : onConfirm}
      >
        <IonIcon icon={getIcon()}></IonIcon>
        {showConflictsWarning && (
          <IonIcon color={'warning'} icon={APPICONS.conflictsAlert}></IonIcon>
        )}
      </IonButton>

      {askConfirm && (
        <ConfirmYesNoDialog
          trigger={trigger}
          onClose={confirmed => {
            if (confirmed) {
              onConfirm();
            }
          }}
        />
      )}
    </>
  );
};
export default SyncRemoteButton;
