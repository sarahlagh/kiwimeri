import { MAIN_CONTENT_ID } from '@/constants';
import useAppInfo from '@/shared/hooks/useAppInfo';
import useDeviceSetting from '@/shared/hooks/useDeviceSetting';
import {
  IonHeader,
  IonIcon,
  IonMenu,
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
      <IonMenu menuId="main-menu" contentId={MAIN_CONTENT_ID}>
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
        <MainMenuList />
      </IonMenu>
      <AppRouterOutlet />
    </>
  );
};

export default MainLayout;
