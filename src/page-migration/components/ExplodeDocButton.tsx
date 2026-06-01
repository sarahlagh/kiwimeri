import { IonButton, IonIcon, IonModal } from '@ionic/react';
import { hammerOutline } from 'ionicons/icons';
import { useRef } from 'react';
import ExplodeDocModal from './ExplodeDocModal';

const ExplodeDocButton = ({ id }: { id: string }) => {
  const modal = useRef<HTMLIonModalElement>(null);
  const trigger = `${id}-explode-doc-btn`;
  return (
    <>
      <IonButton id={trigger}>
        <IonIcon icon={hammerOutline} />
      </IonButton>
      <IonModal ref={modal} trigger={trigger}>
        <ExplodeDocModal
          id={id}
          dismiss={() => {
            modal.current?.dismiss();
          }}
        />
      </IonModal>
    </>
  );
};

export default ExplodeDocButton;
