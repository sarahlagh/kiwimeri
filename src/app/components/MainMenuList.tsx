import { useLocation } from 'react-router-dom';

import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuToggle,
  IonToolbar
} from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import {
  DEBUG_ROUTE,
  GET_FOLDER_ROUTE,
  SETTINGS_ROUTE
} from '../../common/routes';
import { APPICONS } from '../../constants';
import userSettingsService from '../../db/user-settings.service';

interface AppPage {
  key: string;
  url: string;
  icon: string;
  title: string;
}

const MainMenuList = () => {
  const { t } = useLingui();

  const appPages: AppPage[] = [
    {
      key: 'collection',
      title: t`Collection`,
      url: GET_FOLDER_ROUTE(`${userSettingsService.useCurrentFolder()}`),
      icon: APPICONS.collectionPage
    },
    {
      key: 'settings',
      title: t`Settings`,
      url: SETTINGS_ROUTE,
      icon: APPICONS.settingsPage
    },
    {
      key: 'debug',
      title: t`Debug`,
      url: DEBUG_ROUTE,
      icon: APPICONS.debugPage
    }
  ];

  const theme = userSettingsService.useTheme();
  const location = useLocation();
  return (
    <>
      <IonContent>
        <IonList id="main-menu-list">
          {appPages.map(appPage => {
            return (
              <IonMenuToggle key={appPage.key} autoHide={true}>
                <IonItem
                  color={
                    location.pathname.startsWith(appPage.url) ? 'primary' : ''
                  }
                  routerLink={appPage.url}
                  routerDirection="none"
                  lines="none"
                  detail={false}
                >
                  <IonIcon
                    aria-hidden="true"
                    slot="start"
                    icon={appPage.icon}
                  />
                  <IonLabel>{appPage.title}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            );
          })}
        </IonList>
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonButtons slot="end">
            <IonButton
              onClick={() => {
                userSettingsService.setTheme(
                  theme === 'dark' ? 'light' : 'dark'
                );
              }}
            >
              {theme === 'light' && (
                <IonIcon icon={APPICONS.themeLight}></IonIcon>
              )}
              {theme === 'dark' && (
                <IonIcon icon={APPICONS.themeDark}></IonIcon>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </>
  );
};

export default MainMenuList;
