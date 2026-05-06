import { IonApp, IonPage } from '@ionic/react';
import { Trans } from '@lingui/react/macro';

const Loading = () => {
  return (
    <IonApp>
      <IonPage id="main-content">
        <Trans>Loading...</Trans>
      </IonPage>
    </IonApp>
  );
};
export default Loading;
