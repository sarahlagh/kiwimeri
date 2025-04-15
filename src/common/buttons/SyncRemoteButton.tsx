import { APPICONS } from '@/constants';
import { SyncDirection, syncService } from '@/storage-providers/sync.service';
import { IonButton, IonIcon } from '@ionic/react';
import { Id } from 'tinybase/with-schemas';
import ConfirmYesNoDialog from '../modals/ConfirmYesNoDialog';

type SyncRemoteButtonProps = {
  id: Id;
  direction: SyncDirection;
  disabled?: boolean;
  askConfirm?: boolean;
  color?: string;
  fill?: 'clear' | 'outline' | 'solid' | 'default';
};

const SyncRemoteButton = ({
  id,
  direction,
  disabled = false,
  color,
  askConfirm = false,
  fill = 'clear'
}: SyncRemoteButtonProps) => {
  const trigger = `sync-${direction}-button-${id}`;
  const icon =
    direction === 'pull' ? APPICONS.cloudDownload : APPICONS.cloudUpload;
  const onConfirm = async () => {
    await syncService.sync(direction, id);
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
