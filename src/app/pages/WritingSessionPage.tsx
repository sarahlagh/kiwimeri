import {
  IonButtons,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonToolbar
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { lazy } from 'react';

const WritingSession = lazy(() =>
  import('@/features/timed-writing').then(m => ({
    default: m.WritingSession
  }))
);

const WritingSessionPage = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton></IonMenuButton>
          </IonButtons>
          <Trans>Timed Writing Session</Trans>
        </IonToolbar>
      </IonHeader>
      <WritingSession />
    </IonPage>
  );
};
export default WritingSessionPage;
