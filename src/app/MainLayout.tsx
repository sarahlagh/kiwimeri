import {
  IonButton,
  IonHeader,
  IonIcon,
  IonMenu,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import useAppInfo from '../common/hooks/useAppInfo';
import userSettingsService from '../db/user-settings.service';
import AppRouterOutlet from './AppRouterOutlet';
import MainMenuList from './components/MainMenuList';

const MainLayout = () => {
  const appName = useAppInfo();
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
            <IonButton slot="start" fill="clear">
              <IonIcon size={'large'} src="icon.svg"></IonIcon>
            </IonButton>
            <IonTitle style={{ paddingLeft: '6px' }}>
              {appName?.short_name}
            </IonTitle>
          </IonToolbar>
        </IonHeader>
        <MainMenuList></MainMenuList>
      </IonMenu>
      <IonPage id="main-content">
        <AppRouterOutlet></AppRouterOutlet>
      </IonPage>
    </>
  );
};

export default MainLayout;
