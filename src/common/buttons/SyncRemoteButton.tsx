import { APPICONS } from '@/constants';
import { SyncDirection, syncService } from '@/remote-storage/sync.service';
import { IonButton, IonIcon } from '@ionic/react';
import { Id } from 'tinybase/with-schemas';
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
  const trigger = `sync-${direction}-button-${remote}`;
  const icon =
    direction === 'pull' || direction === 'force-pull'
      ? APPICONS.cloudDownload
      : APPICONS.cloudUpload;
  const onConfirm = async () => {
    if (onSyncStart) onSyncStart();
    await syncService.sync(direction, remote);
    if (onSyncEnd) onSyncEnd();
  };
  if (!askConfirm) {
    return (
      <IonButton
        disabled={disabled}
        color={color}
        fill={fill}
        onClick={onConfirm}
      >
        <IonIcon icon={icon}></IonIcon>
      </IonButton>
    );
  }
  return (
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
  );
};
export default SyncRemoteButton;
