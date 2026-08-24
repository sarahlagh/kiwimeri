import { APPICONS } from '@/constants';
import AreYouSureAlert from '@/shared/modals/AreYouSureAlert';
import { IonButton, IonIcon } from '@ionic/react';
import { ReactNode } from 'react';

type DeleteButtonProps = {
  trigger: string;
  slot?: string | undefined;
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
  slot = '',
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
        slot={slot}
        expand="block"
        disabled={disabled}
        color={color}
        fill={fill}
      >
        {children}
        <IonIcon icon={APPICONS.deleteAction}></IonIcon>
      </IonButton>
      <AreYouSureAlert
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
