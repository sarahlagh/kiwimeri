import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

import { setupIonicReact } from '@ionic/react';
import { i18n } from '@lingui/core';
import { initGlobalTrans } from './constants';
import { messages as enMessages } from './locales/en/messages';

import LoadingApp from './app/pages/LoadingApp';

import { appConfig } from './config';
import { plt } from './core/infra/platform';
import './core/infra/polyfills/prism-polyfill';

setupIonicReact({
  sanitizerEnabled: true,
  innerHTMLTemplatesEnabled: true
});
i18n.load(appConfig.DEFAULT_LANG, enMessages);
i18n.activate(appConfig.DEFAULT_LANG);
initGlobalTrans();

/* need to import plt before App */
console.log('detected platform', plt.getPlatform());

const App = lazy(() => import('./App'));

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <Suspense fallback={<LoadingApp />}>
      <App />
    </Suspense>
  </React.StrictMode>
);
