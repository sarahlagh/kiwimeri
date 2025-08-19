import ConfirmYesNoDialog from '@/common/modals/ConfirmYesNoDialog';
import { APPICONS } from '@/constants';
import { IonButton, IonIcon } from '@ionic/react';
import { ReactNode } from 'react';

type DeleteButtonProps = {
  trigger: string;
  onConfirm: () => void;
  onClose?: (role?: string) => void;
  color?: string;
  fill?: 'clear' | 'outline' | 'solid' | 'default';
} & { readonly children?: ReactNode };

const DeleteButton = ({
  trigger,
  onConfirm,
  onClose,
  color,
  fill,
  children
}: DeleteButtonProps) => {
  return (
    <>
      <IonButton id={trigger} expand="block" color={color} fill={fill}>
        {children}
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
