import {
  constructOutline,
  constructSharp,
  folderOutline,
  folderSharp,
  settingsOutline,
  settingsSharp
} from 'ionicons/icons';
import { useLocation } from 'react-router-dom';

import {
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuToggle
} from '@ionic/react';
import { useLingui } from '@lingui/react/macro';

interface AppPage {
  url: string;
  iosIcon: string;
  mdIcon: string;
  title: string;
}

const MainMenuList = () => {
  const { t } = useLingui();

  const appPages: AppPage[] = [
    {
      title: t`Explore`,
      url: '/explore',
      iosIcon: folderOutline,
      mdIcon: folderSharp
    },
    {
      title: t`Settings`,
      url: '/settings',
      iosIcon: settingsOutline,
      mdIcon: settingsSharp
    },
    {
      title: t`Debug`,
      url: '/debug',
      iosIcon: constructOutline,
      mdIcon: constructSharp
    }
  ];

  const location = useLocation();
  return (
    <IonList id="main-menu-list">
      {appPages.map((appPage, index) => {
        return (
          <IonMenuToggle key={index} autoHide={true}>
            <IonItem
              color={location.pathname.startsWith(appPage.url) ? 'primary' : ''}
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
  );
};

export default MainMenuList;
