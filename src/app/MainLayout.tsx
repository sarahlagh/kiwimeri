import {
  IonContent,
  IonHeader,
  IonMenu,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import AppRouterOutlet from './AppRouterOutlet';
import MainMenuList from './components/MainMenuList';

const MainLayout = () => {
  const { t } = useLingui();
  const title = t`Writer App`;
  return (
    <>
      <IonMenu contentId="main-content">
        <IonHeader>
          <IonToolbar>
            <IonTitle>{title}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <MainMenuList></MainMenuList>
        </IonContent>
      </IonMenu>
      <IonPage id="main-content">
        <AppRouterOutlet></AppRouterOutlet>
      </IonPage>
    </>
  );
};

export default MainLayout;
