import useAppInfo from '@/common/hooks/useAppInfo';
import userSettingsService from '@/db/user-settings.service';
import {
  IonHeader,
  IonIcon,
  IonMenu,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/react';
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
          <IonToolbar style={{ paddingLeft: '16px' }}>
            <IonIcon
              slot="start"
              src="icon.svg"
              style={{ fontSize: '26px' }}
            ></IonIcon>
            <IonTitle>{appName?.short_name}</IonTitle>
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
