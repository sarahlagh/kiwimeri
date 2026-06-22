import EditConfigList from '@/common/containers/EditConfigList';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import useDeviceSetting from '@/domain/device-settings/hooks/useDeviceSetting';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';

const CurrentDeviceSettings = () => {
  const defaultRememberLastRoute = useDeviceSetting('rememberLastRoute');
  const defaultResumeLastSelection = useDeviceSetting('resumeLastSelection');
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
              deviceSettings.set('rememberLastRoute', val as boolean);
            } else if (key === 'resumeLastSelection') {
              deviceSettings.set('resumeLastSelection', val as boolean);
            }
          }}
        />
      </IonCardContent>
    </IonCard>
  );
};
export default CurrentDeviceSettings;
