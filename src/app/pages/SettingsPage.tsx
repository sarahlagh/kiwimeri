import { IonContent } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { lazy, Suspense } from 'react';
import TemplateMainPage from './TemplateMainPage';

const Settings = lazy(() =>
  import('@/features/settings-ui').then(m => ({
    default: m.Settings
  }))
);

const SettingsPage = () => {
  const { t } = useLingui();
  return (
    <TemplateMainPage title={t`Settings`}>
      <IonContent>
        <Suspense>
          <Settings />
        </Suspense>
      </IonContent>
    </TemplateMainPage>
  );
};
export default SettingsPage;
