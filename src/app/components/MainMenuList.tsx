import {
  constructOutline,
  constructSharp,
  folderOutline,
  folderSharp,
  moonOutline,
  moonSharp,
  settingsOutline,
  settingsSharp
} from 'ionicons/icons';
import { useLocation } from 'react-router-dom';

import {
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuToggle,
  IonToolbar
} from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import userSettingsService from '../../db/user-settings.service';

interface AppPage {
  key: string;
  url: string;
  iosIcon: string;
  mdIcon: string;
  title: string;
}

const MainMenuList = () => {
  const { t } = useLingui();

  const appPages: AppPage[] = [
    {
      key: 'collection',
      title: t`Collection`,
      url: `/collection/${userSettingsService.useCurrentFolder()}`,
      iosIcon: folderOutline,
      mdIcon: folderSharp
    },
    {
      key: 'settings',
      title: t`Settings`,
      url: '/settings',
      iosIcon: settingsOutline,
      mdIcon: settingsSharp
    },
    {
      key: 'debug',
      title: t`Debug`,
      url: '/debug',
      iosIcon: constructOutline,
      mdIcon: constructSharp
    }
  ];

  const theme = userSettingsService.useTheme();
  const location = useLocation();
  return (
    <>
      <IonList id="main-menu-list" style={{ height: 'calc(100% - 56px)' }}>
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
                  ios={appPage.iosIcon}
                  md={appPage.mdIcon}
                />
                <IonLabel>{appPage.title}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          );
        })}
      </IonList>
      <IonToolbar>
        <IonButtons slot="end">
          <IonButton
            onClick={() => {
              userSettingsService.setTheme(theme === 'dark' ? 'light' : 'dark');
            }}
          >
            {theme === 'light' && <IonIcon icon={moonOutline}></IonIcon>}
            {theme === 'dark' && <IonIcon icon={moonSharp}></IonIcon>}
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </>
  );
};

export default MainMenuList;
