import { useLocation } from 'react-router-dom';

import {
  DEBUG_ROUTE,
  DEV_TOOLS_ROUTE,
  GET_ITEM_ROUTE,
  isCollectionRoute,
  SETTINGS_ROUTE
} from '@/common/routes';
import platformService from '@/common/services/platform.service';
import CatchClickLabel from '@/common/utils/CatchClickLabel';
import { appConfig } from '@/config';
import { APPICONS } from '@/constants';
import navService from '@/db/nav.service';
import userSettingsService from '@/db/user-settings.service';
import NotebookSwitcher from '@/notebooks/components/NotebookSwitcher';
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

interface AppPage {
  key: string;
  url: string;
  icon: string;
  title: string;
  isActive?: () => boolean;
}

const MainMenuList = () => {
  const { t } = useLingui();
  const location = useLocation();
  const theme = userSettingsService.useTheme();
  const showDevTools = userSettingsService.useShowDevTools();

  function isActive(appPage: AppPage) {
    if (appPage.isActive) {
      return appPage.isActive();
    }
    const idx = appPage.url.indexOf('?');
    return location.pathname.startsWith(
      idx >= 0 ? appPage.url.substring(0, idx) : appPage.url
    );
  }

  const appPages: AppPage[] = [
    {
      key: 'collection',
      title: t`Collection`,
      url: GET_ITEM_ROUTE(
        `${navService.getCurrentFolder()}`,
        navService.getCurrentDocument(),
        navService.getCurrentPage()
      ),
      icon: APPICONS.collectionPage,
      isActive: () => isCollectionRoute(location.pathname)
    },
    {
      key: 'settings',
      title: t`Settings`,
      url: SETTINGS_ROUTE,
      icon: APPICONS.settingsPage
    }
  ];
  if (!platformService.isRelease()) {
    appPages.push({
      key: 'debug',
      title: t`Debug`,
      url: DEBUG_ROUTE,
      icon: APPICONS.devToolsPage
    });
  }
  if (showDevTools) {
    appPages.push({
      key: 'devtools',
      title: t`Dev Tools`,
      url: DEV_TOOLS_ROUTE,
      icon: APPICONS.devToolsPage
    });
  }

  return (
    <>
      <IonContent>
        <IonList id="main-menu-list">
          <IonItem lines="none">
            <NotebookSwitcher />
          </IonItem>
          <IonMenuToggle autoHide={true}>
            {appPages.map(appPage => {
              return (
                <IonItem
                  key={appPage.key}
                  color={isActive(appPage) ? 'primary' : ''}
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
              );
            })}
          </IonMenuToggle>
        </IonList>
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonItem slot="start" lines="none">
            <CatchClickLabel
              goalClicks={7}
              onFinalClick={() => {
                userSettingsService.setShowDevTools(true);
              }}
            >
              {appConfig.KIWIMERI_VERSION}
            </CatchClickLabel>
          </IonItem>
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
