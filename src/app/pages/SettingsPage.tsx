import { IonContent } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { lazy } from 'react';
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
        <Settings />
      </IonContent>
    </TemplateMainPage>
  );
};
export default SettingsPage;
