import { IonContent } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { lazy } from 'react';
import TemplateMainPage from './TemplateMainPage';

const SynchronizationSettings = lazy(() =>
  import('@/features/synchronization-ui').then(m => ({
    default: m.SynchronizationSettings
  }))
);

const SynchronizationPage = () => {
  const { t } = useLingui();
  return (
    <TemplateMainPage title={t`Synchronization & Backup`}>
      <IonContent>
        <SynchronizationSettings />
      </IonContent>
    </TemplateMainPage>
  );
};
export default SynchronizationPage;
