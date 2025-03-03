import { IonContent, IonHeader, IonPage } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import MainHeader from '../components/MainHeader';

const OtherPage = () => {
  const { t } = useLingui();
  return (
    <IonPage>
      <IonHeader>
        <MainHeader title={t`Other`}></MainHeader>
      </IonHeader>
      <IonContent>Just a page test</IonContent>
    </IonPage>
  );
};
export default OtherPage;
