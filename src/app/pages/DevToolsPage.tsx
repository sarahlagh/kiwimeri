import useShowDevTools from '@/app/hooks/useShowDevTools';
import { IonContent } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { lazy, Suspense } from 'react';
import NotFoundPage from './NotFoundPage';
import TemplateMainPage from './TemplateMainPage';

const DevTools = lazy(() =>
  import('@/features/dev-tools').then(m => ({
    default: m.DevTools
  }))
);

const DevToolsPage = () => {
  const { t } = useLingui();
  const showDevTools = useShowDevTools();
  if (!showDevTools) {
    return <NotFoundPage />;
  }
  return (
    <TemplateMainPage title={t`Dev Tools`}>
      <IonContent>
        <Suspense>
          <DevTools />
        </Suspense>
      </IonContent>
    </TemplateMainPage>
  );
};
export default DevToolsPage;
