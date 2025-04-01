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
import './theme/variables.css';

import { IonApp, setupIonicReact } from '@ionic/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';

import { IonReactRouter } from '@ionic/react-router';
import MainLayout from './app/MainLayout';
import DebugTinybaseProvider from './app/providers/DebugTinybaseProvider';
import InitialRoutingProvider from './app/providers/InitialRoutingProvider';
import TinybaseProvider from './app/providers/TinybaseProvider';
import platformService from './common/services/platform.service';
import { appConfig, initGlobalTrans } from './config';
import { messages as enMessages } from './locales/en/messages';

setupIonicReact();
i18n.load('en', enMessages);
i18n.activate('en');
initGlobalTrans();

const App = () => {
  return (
    <>
      <I18nProvider i18n={i18n}>
        <TinybaseProvider>
          {/* TODO check if storage service is started here? */}
          <IonApp className={platformService.getPlatform()}>
            <IonReactRouter>
              <InitialRoutingProvider>
                <MainLayout></MainLayout>
              </InitialRoutingProvider>
            </IonReactRouter>
          </IonApp>
        </TinybaseProvider>
      </I18nProvider>

      {platformService.isDev() && appConfig.VITE_ENABLE_STORE_INSPECTOR && (
        <DebugTinybaseProvider></DebugTinybaseProvider>
      )}
    </>
  );
};

export default App;
