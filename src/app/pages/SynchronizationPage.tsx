import SynchronizationSettings from '@/synchronization/components/SynchronizationSettings';
import { IonContent } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import TemplateMainPage from './TemplateMainPage';

const SynchronizationPage = () => {
  const { t } = useLingui();
  return (
    <TemplateMainPage title={t`Synchronization`}>
      <IonContent>
        <SynchronizationSettings />
      </IonContent>
    </TemplateMainPage>
  );
};
export default SynchronizationPage;
