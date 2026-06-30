import { IonAlert } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { useRef } from 'react';

type ConfirmYesNoDialogProps = {
  trigger: string;
  onClose: (confirmed: boolean) => void;
  header?: string;
  message?: string;
} & React.HTMLAttributes<HTMLIonAlertElement>;

const ConfirmYesNoDialog = ({
  trigger,
  onClose,
  header,
  message
}: ConfirmYesNoDialogProps) => {
  const { t } = useLingui();
  const modal = useRef<HTMLIonModalElement>(null);

  return (
    <IonAlert
      trigger={trigger}
      header={header || t`Are you sure?`}
      message={message}
      buttons={[
        {
          text: t`Cancel`,
          role: 'cancel',
          handler: () => {
            modal.current?.dismiss();
            onClose(false);
          }
        },
        {
          text: t`Confirm`,
          role: 'confirm',
          handler: () => {
            modal.current?.dismiss(null, 'confirm');
            onClose(true);
          }
        }
      ]}
      onDidDismiss={() => onClose(false)}
    ></IonAlert>
  );
};
export default ConfirmYesNoDialog;
