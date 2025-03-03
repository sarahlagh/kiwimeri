import {
  IonButtons,
  IonContent,
  IonHeader,
  IonMenu,
  IonMenuButton,
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
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonMenuButton></IonMenuButton>
            </IonButtons>
            <IonTitle>{title}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <AppRouterOutlet></AppRouterOutlet>
        </IonContent>
      </IonPage>
    </>
  );
};

export default MainLayout;
