import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

import { setupIonicReact } from '@ionic/react';
import { i18n } from '@lingui/core';
import { initGlobalTrans } from './constants';
import { messages as enMessages } from './locales/en/messages';

import LoadingPage from './app/pages/LoadingPage';

setupIonicReact({
  sanitizerEnabled: true
});
i18n.load('en', enMessages);
i18n.activate('en');
initGlobalTrans();

const App = lazy(() => import('./App'));

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <Suspense fallback={<LoadingPage />}>
      <App />
    </Suspense>
  </React.StrictMode>
);
