import EditConfigList from '@/common/containers/EditConfigList';
import navService from '@/db/nav.service';
import userSettingsService from '@/db/user-settings.service';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';

const CurrentDeviceSettings = () => {
  const defaultRememberLastRoute = navService.useRememberLastRoute();
  const defaultResumeLastSelection =
    userSettingsService.useResumeLastSelection();
  const { t } = useLingui();

  return (
    <IonCard className="primary">
      <IonCardHeader>
        <IonCardTitle>
          <Trans>Device Settings</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>
            Options for the currently selected device. These options are
            local-only.
          </Trans>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        <EditConfigList
          rows={[
            {
              key: 'rememberLastRoute',
              label: t`Remember last route`,
              description: t`When enabled, when you open the app you will be redirected to the last document you were working on instead of the root of the current space.`,
              type: 'boolean'
            },
            {
              key: 'resumeLastSelection',
              label: t`Scroll to the last position in document`,
              type: 'boolean'
            }
          ]}
          initialState={{
            rememberLastRoute: defaultRememberLastRoute,
            resumeLastSelection: defaultResumeLastSelection
          }}
          onChange={(key, val) => {
            if (key === 'rememberLastRoute') {
              navService.setRememberLastRoute(val as boolean);
            } else if (key === 'resumeLastSelection') {
              userSettingsService.setResumeLastSelection(val as boolean);
            }
          }}
        />
      </IonCardContent>
    </IonCard>
  );
};
export default CurrentDeviceSettings;
