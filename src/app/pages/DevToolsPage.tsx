import DevTools from '@/dev-tools/components/DevTools';
import useDeviceSetting from '@/domain/device-settings/hooks/useDeviceSetting';
import { IonContent } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import NotFoundPage from './NotFoundPage';
import TemplateMainPage from './TemplateMainPage';

const DevToolsPage = () => {
  const { t } = useLingui();
  const showDevTools = useDeviceSetting('showDevTools');
  if (!showDevTools) {
    return <NotFoundPage />;
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
