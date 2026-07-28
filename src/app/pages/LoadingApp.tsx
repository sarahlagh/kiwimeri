import { MAIN_CONTENT_ID } from '@/constants';
import { IonApp, IonPage } from '@ionic/react';
import Loading from '../components/Loading';

const LoadingApp = () => {
  return (
    <IonApp>
      <IonPage id={MAIN_CONTENT_ID}>
        <Loading />
      </IonPage>
    </IonApp>
  );
};
export default LoadingApp;
