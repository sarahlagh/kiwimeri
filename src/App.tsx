import '@ionic/react/css/core.css';
/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
/* Optional CSS utils that can be commented out */
import '@ionic/react/css/display.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
/* Dark Theme */
import '@ionic/react/css/palettes/dark.class.css';
/* Theme variables */
import './theme/variables.scss';

import { IonApp, setupIonicReact } from '@ionic/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';

import { IonReactRouter } from '@ionic/react-router';
import { useEffect } from 'react';
import MainLayout from './app/MainLayout';
import InitialRoutingProvider from './app/providers/InitialRoutingProvider';
import { NetworkStatusProvider } from './app/providers/NetworkStatusProvider';
import TinybaseProvider from './app/providers/TinybaseProvider';
import { ToastProvider } from './app/providers/ToastProvider';
import platformService from './common/services/platform.service';
import { initGlobalTrans } from './config';
import { messages as enMessages } from './locales/en/messages';

setupIonicReact();
i18n.load('en', enMessages);
i18n.activate('en');
initGlobalTrans();

const App = () => {
  useEffect(() => {
    const appInit = async () => {
      // Check if site's storage has been marked as persistent
      if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.debug(`persisted storage granted: ${isPersisted}`);
      }
    };
    appInit();
  });
  return (
    <>
      <I18nProvider i18n={i18n}>
        <NetworkStatusProvider>
          <TinybaseProvider>
            <ToastProvider>
              <IonApp className={platformService.getPlatform()}>
                <IonReactRouter>
                  <InitialRoutingProvider>
                    <MainLayout></MainLayout>
                  </InitialRoutingProvider>
                </IonReactRouter>
              </IonApp>
            </ToastProvider>
          </TinybaseProvider>
        </NetworkStatusProvider>
      </I18nProvider>
    </>
  );
};

export default App;
