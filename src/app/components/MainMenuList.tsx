import { useLocation } from 'react-router-dom';

import {
  DEV_TOOLS_ROUTE,
  GET_ITEM_ROUTE,
  isCollectionRoute,
  SETTINGS_ROUTE,
  SYNCHRONIZATION_ROUTE,
  WRITING_SESSION_ROUTE
} from '@/app/routes';
import { appConfig } from '@/config';
import { APPICONS } from '@/constants';
import { resumeService } from '@/domain/collection/resume-state.service';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import useDeviceSetting from '@/domain/device-settings/hooks/useDeviceSetting';
import useShowDevTools from '@/domain/device-settings/hooks/useShowDevTools';
import { NotebookSwitcher } from '@/features/notebooks-ui';
import CatchClickLabel from '@/shared/utils/CatchClickLabel';
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
  const theme = useDeviceSetting('theme');
  const showDevTools = useShowDevTools();

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
        `${resumeService.getNotebookResumeState()?.lastFolder}`,
        `${resumeService.getNotebookResumeState()?.lastDocument}`
      ),
      icon: APPICONS.collectionPage,
      isActive: () => isCollectionRoute(location.pathname)
    },
    {
      key: 'write-session',
      title: t`Timed Writing`,
      url: WRITING_SESSION_ROUTE,
      icon: APPICONS.timedWriting
    },
    {
      key: 'settings',
      title: t`Settings`,
      url: SETTINGS_ROUTE,
      icon: APPICONS.settingsPage
    },
    {
      key: 'sync',
      title: t`Synchronization & Backup`,
      url: SYNCHRONIZATION_ROUTE,
      icon: APPICONS.synchronizationPage
    }
  ];
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
                deviceSettings.set('showDevTools', true);
              }}
            >
              {appConfig.KIWIMERI_VERSION}
            </CatchClickLabel>
          </IonItem>
          <IonButtons slot="end">
            <IonButton
              onClick={() => {
                deviceSettings.setTheme(theme === 'dark' ? 'light' : 'dark');
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
