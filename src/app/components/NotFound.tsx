import { IonApp, IonPage } from '@ionic/react';
import { Trans } from '@lingui/react/macro';

const NotFound = () => {
  return (
    <IonApp>
      <IonPage id="main-content">
        <Trans>Not Found</Trans>
      </IonPage>
    </IonApp>
  );
};
export default NotFound;
