import { APPICONS } from '@/constants';
import { SyncDirection, syncService } from '@/remote-storage/sync.service';
import { IonButton, IonIcon } from '@ionic/react';
import { Id } from 'tinybase/with-schemas';
import useNetworkStatus from '../hooks/useNetworkStatus';
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
};

const SyncRemoteButton = ({
  remote,
  direction,
  disabled = false,
  color,
  askConfirm = false,
  fill = 'clear',
  onSyncStart,
  onSyncEnd
}: SyncRemoteButtonProps) => {
  const networkStatus = useNetworkStatus();
  const trigger = `sync-${direction}-button-${remote}`;
  const icon =
    direction === 'sync'
      ? APPICONS.cloudSync
      : direction === 'pull' || direction === 'force-pull'
        ? APPICONS.cloudDownload
        : APPICONS.cloudUpload;
  const onConfirm = async () => {
    if (onSyncStart) onSyncStart();
    await syncService.sync(direction, remote);
    if (onSyncEnd) onSyncEnd();
  };
  if (!networkStatus.connected) {
    return (
      <IonButton disabled={true}>
        <IonIcon icon={APPICONS.cloudOffline}></IonIcon>
      </IonButton>
    );
  }
  return (
    <>
      {askConfirm ? (
        <>
          <IonButton
            id={trigger}
            disabled={disabled}
            expand="block"
            color={color}
            fill={fill}
          >
            <IonIcon icon={icon}></IonIcon>
          </IonButton>
          <ConfirmYesNoDialog
            trigger={trigger}
            onClose={confirmed => {
              if (confirmed) {
                onConfirm();
              }
            }}
          />
        </>
      ) : (
        <IonButton
          disabled={disabled}
          color={color}
          fill={fill}
          onClick={onConfirm}
        >
          <IonIcon icon={icon}></IonIcon>
        </IonButton>
      )}
    </>
  );
};
export default SyncRemoteButton;
