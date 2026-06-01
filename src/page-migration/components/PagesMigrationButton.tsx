import { APPICONS } from '@/constants';
import { IonButton, IonIcon, IonModal } from '@ionic/react';
import { useRef } from 'react';
import PagesMigrationModal from './PagesMigrationModal';

const PagesMigrationButton = () => {
  const modal = useRef<HTMLIonModalElement>(null);
  return (
    <>
      <IonButton color="warning" id="global-page-migration-btn">
        <IonIcon icon={APPICONS.warning} />
      </IonButton>
      <IonModal ref={modal} trigger={`global-page-migration-btn`}>
        <PagesMigrationModal
          dismiss={() => {
            modal.current?.dismiss();
          }}
        />
      </IonModal>
    </>
  );
};

export default PagesMigrationButton;
