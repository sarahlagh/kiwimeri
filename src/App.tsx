/* Core CSS required for Ionic components to work properly */
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
/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */
// import '@ionic/react/css/palettes/dark.always.css';
// import '@ionic/react/css/palettes/dark.system.css';
import '@ionic/react/css/palettes/dark.class.css';
/* Theme variables */
import './theme/variables.css';

import { IonApp, setupIonicReact } from '@ionic/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';

import { IonReactRouter } from '@ionic/react-router';
import MainLayout from './app/MainLayout';
import TinybaseProvider from './app/providers/TinybaseProvider';
import { messages as enMessages } from './locales/en/messages';

setupIonicReact();
i18n.load('en', enMessages);
i18n.activate('en');

const App = () => {
  return (
    <TinybaseProvider>
      <I18nProvider i18n={i18n}>
        <IonApp>
          <IonReactRouter>
            <MainLayout></MainLayout>
          </IonReactRouter>
        </IonApp>
      </I18nProvider>
    </TinybaseProvider>
  );
};

export default App;
