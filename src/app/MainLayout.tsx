import { MAIN_CONTENT_ID } from '@/constants';
import { useQueryResults } from '@/core/db/queries-helper';
import { getNotificationColor } from '@/core/notifications/notifications';
import { notifsSvc } from '@/core/notifications/notifications.service';
import useAppInfo from '@/shared/hooks/useAppInfo';
import useDeviceSetting from '@/shared/hooks/useDeviceSetting';
import useGenericQueryInstance from '@/shared/hooks/useGenericQueryInstance';
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
import { useToastContext } from './context/ToastContext';
import fetchNotificationsQuery from './queries/fetchNotificationsQuery';

const MainLayout = () => {
  const appName = useAppInfo();
  const theme = useDeviceSetting('theme');
  const { setPersistentToast } = useToastContext();
  const notifQuery = useGenericQueryInstance(
    'MainLayout',
    fetchNotificationsQuery,
    { all: false }
  );
  const notifications = useQueryResults(notifQuery);

  useEffect(() => {
    document.documentElement.classList.toggle(
      'ion-palette-dark',
      theme === 'dark'
    );
  }, [theme]);

  useEffect(() => {
    fetchNotificationsQuery.initQuery({ all: true });
  }, []);

  useEffect(() => {
    if (notifications.length > 0) {
      setPersistentToast(
        notifications[0].message,
        getNotificationColor(notifications[0].level),
        () => notifsSvc.ack(notifications[0].id)
      );
    }
  }, [notifications]);

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
