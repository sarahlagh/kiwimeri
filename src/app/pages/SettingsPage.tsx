import { Settings } from '@/features/settings-ui';
import { IonContent } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import TemplateMainPage from './TemplateMainPage';

const SettingsPage = () => {
  const { t } = useLingui();
  return (
    <TemplateMainPage title={t`Settings`}>
      <IonContent>
        <Settings></Settings>
      </IonContent>
    </TemplateMainPage>
  );
};
export default SettingsPage;
