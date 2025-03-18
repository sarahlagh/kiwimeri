import {
  IonContent,
  IonHeader,
  IonMenu,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import userSettingsService from '../db/user-settings.service';
import AppRouterOutlet from './AppRouterOutlet';
import MainMenuList from './components/MainMenuList';

const MainLayout = () => {
  const theme = userSettingsService.useTheme();
  document.documentElement.classList.toggle(
    'ion-palette-dark',
    theme === 'dark'
  );

  return (
    <>
      <IonMenu contentId="main-content">
        <IonHeader>
          <IonToolbar>
            <IonTitle>
              <Trans>Kiwi Meri</Trans>
            </IonTitle>
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
