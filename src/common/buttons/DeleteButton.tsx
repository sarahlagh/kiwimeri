import ConfirmYesNoDialog from '@/common/modals/ConfirmYesNoDialog';
import { APPICONS } from '@/constants';
import { IonButton, IonIcon } from '@ionic/react';
import { ReactNode } from 'react';

type DeleteButtonProps = {
  trigger: string;
  onConfirm: () => void;
  onClose?: (role?: string) => void;
  message?: string;
  color?: string;
  fill?: 'clear' | 'outline' | 'solid' | 'default';
  disabled?: boolean;
} & React.HTMLAttributes<HTMLIonButtonElement> & {
    readonly children?: ReactNode;
  };

const DeleteButton = ({
  trigger,
  onConfirm,
  onClose,
  color,
  fill,
  disabled = false,
  message,
  children
}: DeleteButtonProps) => {
  return (
    <>
      <IonButton
        id={trigger}
        expand="block"
        disabled={disabled}
        color={color}
        fill={fill}
      >
        {children}
        <IonIcon icon={APPICONS.deleteAction}></IonIcon>
      </IonButton>
      <ConfirmYesNoDialog
        trigger={trigger}
        message={message}
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
