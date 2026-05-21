import TinybaseProvider from '@/app/providers/TinybaseProvider';
import { IonApp } from '@ionic/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';

export const TestingProvider = ({ children }: any) => (
  <I18nProvider i18n={i18n}>
    <TinybaseProvider>
      <IonApp>{children}</IonApp>
    </TinybaseProvider>
  </I18nProvider>
);
