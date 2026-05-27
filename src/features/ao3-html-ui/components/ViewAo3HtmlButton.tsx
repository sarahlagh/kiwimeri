import { IonButton, useIonModal } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { lazy } from 'react';

type ViewAo3HtmlProps = {
  id: string;
  onClose?: (role?: string) => void;
};

const ViewAo3HtmlModal = lazy(() => import('./ViewAo3HtmlModal'));

const ViewAo3HtmlButton = ({ id, onClose }: ViewAo3HtmlProps) => {
  const [present, dismiss] = useIonModal(ViewAo3HtmlModal, {
    id,
    dismiss: (data?: string, role?: string) => dismiss(data, role)
  });

  return (
    <IonButton
      onClick={() => {
        present({
          cssClass: 'keyboard-aware-modal',
          onDidDismiss: () => {
            if (onClose) {
              onClose();
            }
          }
        });
      }}
    >
      <Trans>AO3</Trans>
    </IonButton>
  );
};

export default ViewAo3HtmlButton;
