import useAppInfo from '@/common_to_migrate/hooks/useAppInfo';
import useDeviceSetting from '@/domain/device-settings/hooks/useDeviceSetting';
import {
  IonHeader,
  IonIcon,
  IonMenu,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useEffect } from 'react';
import AppRouterOutlet from './AppRouterOutlet';
import MainMenuList from './components/MainMenuList';

const MainLayout = () => {
  const appName = useAppInfo();
  const theme = useDeviceSetting('theme');
  useEffect(() => {
    document.documentElement.classList.toggle(
      'ion-palette-dark',
      theme === 'dark'
    );
  }, [theme]);

  return (
    <>
      <IonMenu menuId="main-menu" contentId="main-content">
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
