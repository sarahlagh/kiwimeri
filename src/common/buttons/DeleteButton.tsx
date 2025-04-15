import ConfirmYesNoDialog from '@/common/modals/ConfirmYesNoDialog';
import { APPICONS } from '@/constants';
import { IonButton, IonIcon } from '@ionic/react';

type DeleteButtonProps = {
  trigger: string;
  onConfirm: () => void;
  onClose?: (role?: string) => void;
};

const DeleteButton = ({ trigger, onConfirm, onClose }: DeleteButtonProps) => {
  return (
    <>
      <IonButton id={trigger} expand="block">
        <IonIcon icon={APPICONS.deleteAction}></IonIcon>
      </IonButton>
      <ConfirmYesNoDialog
        trigger={trigger}
        onClose={confirmed => {
          if (confirmed) {
            onConfirm();
          }
          if (onClose) onClose(confirmed ? 'confirm' : 'cancel');
        }}
      />
    </>
  );
};
export default DeleteButton;
