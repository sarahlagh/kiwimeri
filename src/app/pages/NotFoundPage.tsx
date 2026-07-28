import { MAIN_CONTENT_ID } from '@/constants';
import { IonPage } from '@ionic/react';
import NotFound from '../components/NotFound';

const NotFoundPage = () => {
  return (
    <IonPage id={MAIN_CONTENT_ID}>
      <NotFound />
    </IonPage>
  );
};
export default NotFoundPage;
