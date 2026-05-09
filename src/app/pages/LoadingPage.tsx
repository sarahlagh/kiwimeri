import { IonApp, IonPage } from '@ionic/react';
import Loading from '../components/Loading';

const LoadingPage = () => {
  return (
    <IonApp>
      <IonPage id="main-content">
        <Loading />
      </IonPage>
    </IonApp>
  );
};
export default LoadingPage;
