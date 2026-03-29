import WritingSession from '@/timed-writing/components/WritingSession';
import {
  IonButtons,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonToolbar
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';

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
