import TinybaseProvider from '@/app/providers/TinybaseProvider';
import { ToastProvider } from '@/app/providers/ToastProvider';
import { IonApp } from '@ionic/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { BrowserRouter } from 'react-router';

export const TestingProvider = ({ children }: any) => (
  <I18nProvider i18n={i18n}>
    <TinybaseProvider>
      <ToastProvider>
        <BrowserRouter>
          <IonApp>{children}</IonApp>
        </BrowserRouter>
      </ToastProvider>
    </TinybaseProvider>
  </I18nProvider>
);
