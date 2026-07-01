import useShowDevTools from '@/app/hooks/useShowDevTools';
import { DevTools } from '@/features/dev-tools';
import { IonContent } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import NotFoundPage from './NotFoundPage';
import TemplateMainPage from './TemplateMainPage';

const DevToolsPage = () => {
  const { t } = useLingui();
  const showDevTools = useShowDevTools();
  if (!showDevTools) {
    return <NotFoundPage />;
  }
  return (
    <TemplateMainPage title={t`Dev Tools`}>
      <IonContent>
        <DevTools />
      </IonContent>
    </TemplateMainPage>
  );
};
export default DevToolsPage;
