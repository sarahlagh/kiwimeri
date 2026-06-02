import './core/db/store';

import { appInit } from './app-init';

import '@ionic/react/css/core.css';
/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/display.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/palettes/dark.class.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/typography.css';
/* global */
import './theme/global.scss';

import { IonApp } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import MainLayout from './app/MainLayout';
import InitialRoutingProvider from './app/providers/InitialRoutingProvider';
import { NetworkStatusProvider } from './app/providers/NetworkStatusProvider';
import TinybaseProvider from './app/providers/TinybaseProvider';
import { ToastProvider } from './app/providers/ToastProvider';

import { plt } from './core/infra/platform';
import './polyfills/capacitor-http-fetch-polyfill';
import './polyfills/log-polyfill';

if (plt.isAndroid()) {
  import('./theme/android-edge-to-edge.scss').then(() => {
    console.debug('loaded stylesheet for android');
  });
}

appInit();

const App = () => {
  return (
    <>
      <I18nProvider i18n={i18n}>
        <NetworkStatusProvider>
          <TinybaseProvider>
            <ToastProvider>
              <IonApp className={plt.getPlatform()}>
                <IonReactRouter>
                  <InitialRoutingProvider>
                    <MainLayout />
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
