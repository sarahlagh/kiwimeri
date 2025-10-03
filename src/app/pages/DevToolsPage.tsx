import userSettingsService from '@/db/user-settings.service';
import DevTools from '@/dev-tools/components/DevTools';
import { IonContent } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import NotFound from '../components/NotFound';
import TemplateMainPage from './TemplateMainPage';

const DevToolsPage = () => {
  const { t } = useLingui();
  const showDevTools = userSettingsService.useShowDevTools();
  if (!showDevTools) {
    return <NotFound></NotFound>;
  }
  return (
    <TemplateMainPage title={t`Dev Tools`}>
      <IonContent>
        <DevTools></DevTools>
      </IonContent>
    </TemplateMainPage>
  );
};
export default DevToolsPage;
