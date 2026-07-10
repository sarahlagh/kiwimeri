import LazyModalTemplate from '@/shared/modals/LazyModalTemplate';
import { IonButton, useIonModal } from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { lazy } from 'react';

type ViewAo3HtmlProps = {
  id: string;
  onClose?: (role?: string) => void;
};

export type ViewAo3HtmlModalProps = {
  id: string;
  dismiss: (version?: string, role?: 'goToVersion' | 'restore') => void;
};

const ViewAo3HtmlModal = lazy(() => import('./ViewAo3HtmlModal'));

function ViewAo3HtmlModalWrapped(props: ViewAo3HtmlModalProps) {
  return (
    <LazyModalTemplate>
      <ViewAo3HtmlModal {...props} />
    </LazyModalTemplate>
  );
}

const ViewAo3HtmlButton = ({ id, onClose }: ViewAo3HtmlProps) => {
  const [present, dismiss] = useIonModal(ViewAo3HtmlModalWrapped, {
    id,
    dismiss: (data?: string, role?: string) => dismiss(data, role)
  });

  return (
    <IonButton
      onClick={() => {
        present({
          cssClass: 'fixed-width-modal',
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
