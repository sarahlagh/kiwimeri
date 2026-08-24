import { IonAlert } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { useRef } from 'react';

type AreYouSureDialogProps = {
  trigger: string;
  onClose: (confirmed: boolean) => void;
  header?: string;
  message?: string;
} & React.HTMLAttributes<HTMLIonAlertElement>;

const AreYouSureAlert = ({
  trigger,
  onClose,
  header,
  message
}: AreYouSureDialogProps) => {
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
export default AreYouSureAlert;
