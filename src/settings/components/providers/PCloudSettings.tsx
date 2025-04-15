import platformService from '@/common/services/platform.service';
import { remotesService } from '@/db/remotes.service';
import { PCloudConf } from '@/storage-providers/pcloud/pcloud';
import {
  InputCustomEvent,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonLabel,
  IonSegment,
  IonSegmentButton
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import RemoteGenericSettings, {
  RemoteGenericSettingsChildProps
} from './RemoteGenericSettings';

type PCloudSettingsProps = {} & RemoteGenericSettingsChildProps;

const PCloudSettings = ({
  remote,
  isPrimary,
  isLast,
  reorderEnabled
}: PCloudSettingsProps) => {
  const { t } = useLingui();
  const [checking, setChecking] = useState(false);
  const syncConf = JSON.parse(remote.config) as PCloudConf;

  const onChange = async (
    key: keyof PCloudConf | 'name',
    e: InputCustomEvent
  ) => {
    const value = e.detail.value || '';
    if (key === 'name') {
      remotesService.setRemoteName(remote.id, value);
      return;
    }
    if (key !== 'serverLocation') {
      syncConf[key] = value;
    } else {
      syncConf.serverLocation = (e.detail.value as 'eu' | 'us') || 'eu';
    }
    remotesService.setRemoteConfig(remote.id, syncConf);
    if (syncConf.username && syncConf.password) {
      setChecking(true);
      const connected = await remotesService.configure(
        remote.id,
        remote.state,
        // don't send full object, want to erase folderid & fileid
        {
          path: syncConf.path,
          username: syncConf.username,
          password: syncConf.password,
          serverLocation: syncConf.serverLocation
        }
      );
      remotesService.setRemoteStateConnected(remote.state, connected);
      setChecking(false);
    }
  };

  const labelPlacement = platformService.isWideEnough() ? undefined : 'stacked';

  return (
    <RemoteGenericSettings
      title={t`PCloud Configuration`}
      remote={remote}
      checking={checking}
      isPrimary={isPrimary}
      isLast={isLast}
      reorderEnabled={reorderEnabled}
    >
      <IonItem lines="none">
        <IonLabel slot="start">
          <Trans>Server</Trans>
        </IonLabel>
        <IonSegment
          mode="ios"
          value={syncConf.serverLocation}
          onIonChange={e =>
            onChange('serverLocation', e as unknown as InputCustomEvent)
          }
        >
          <IonSegmentButton value="eu">
            <IonLabel>
              <Trans>EU</Trans>
            </IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="us">
            <IonLabel>
              <Trans>US</Trans>
            </IonLabel>
          </IonSegmentButton>
        </IonSegment>
      </IonItem>
      <IonItem>
        <IonLabel slot="start" className="ion-hide-md-down">
          <Trans>Path</Trans>
        </IonLabel>
        <IonInput
          label={labelPlacement ? t`Path` : undefined}
          labelPlacement={labelPlacement}
          onIonChange={e => onChange('path', e)}
          placeholder={t`Leave empty for root`}
          value={syncConf.path}
        ></IonInput>
      </IonItem>
      <IonItem>
        <IonLabel slot="start" className="ion-hide-md-down">
          <Trans>Username</Trans>
        </IonLabel>
        <IonInput
          label={labelPlacement ? t`Username` : undefined}
          labelPlacement={labelPlacement}
          onIonChange={e => onChange('username', e)}
          placeholder={t`Enter your username`}
          value={syncConf.username}
        ></IonInput>
      </IonItem>
      <IonItem>
        <IonLabel slot="start" className="ion-hide-md-down">
          <Trans>Password</Trans>
        </IonLabel>
        <IonInput
          type="password"
          label={labelPlacement ? t`Password` : undefined}
          labelPlacement={labelPlacement}
          onIonChange={e => onChange('password', e)}
          placeholder={t`Enter your password`}
          value={syncConf.password}
        >
          <IonInputPasswordToggle slot="end"></IonInputPasswordToggle>
        </IonInput>
      </IonItem>
    </RemoteGenericSettings>
  );
};
export default PCloudSettings;
