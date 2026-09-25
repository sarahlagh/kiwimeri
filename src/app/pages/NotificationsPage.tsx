import { IonContent } from '@ionic/react';
import { useLingui } from '@lingui/react/macro';
import { lazy, Suspense } from 'react';
import TemplateMainPage from './TemplateMainPage';

const Notifications = lazy(() =>
  import('@/features/notifications-ui').then(m => ({
    default: m.Notifications
  }))
);

const NotificationsPage = () => {
  const { t } = useLingui();
  return (
    <TemplateMainPage title={t`Notifications`}>
      <IonContent>
        <Suspense>
          <Notifications />
        </Suspense>
      </IonContent>
    </TemplateMainPage>
  );
};
export default NotificationsPage;
