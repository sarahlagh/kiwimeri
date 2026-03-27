import DangerousMode from '@/dangerous-mode/components/DangerousMode';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonToolbar
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';

const DangerousModePage = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton></IonMenuButton>
          </IonButtons>
          <Trans>Dangerous Writing App Mode</Trans>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <DangerousMode />
      </IonContent>
    </IonPage>
  );
};
export default DangerousModePage;
