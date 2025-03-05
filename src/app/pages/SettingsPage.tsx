import { IonContent, IonHeader, IonPage } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import Settings from '../../settings/components/Settings';
import MainHeader from '../components/MainHeader';

const SettingsPage = () => {
  const { t } = useLingui();
  return (
    <IonPage>
      <IonHeader>
        <MainHeader title={t`Settings`}></MainHeader>
      </IonHeader>
      <IonContent>
        <Settings></Settings>
      </IonContent>
    </IonPage>
  );
};
export default SettingsPage;
