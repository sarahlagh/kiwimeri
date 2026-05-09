import { IonApp, IonPage } from '@ionic/react';
import NotFound from '../components/NotFound';

const NotFoundPage = () => {
  return (
    <IonApp>
      <IonPage id="main-content">
        <NotFound />
      </IonPage>
    </IonApp>
  );
};
export default NotFoundPage;
