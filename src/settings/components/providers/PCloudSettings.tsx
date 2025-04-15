import platformService from '@/common/services/platform.service';
import { APPICONS } from '@/constants';
import { remotesService } from '@/db/remotes.service';
import { RemoteResult } from '@/db/store-types';
import { PCloudConf } from '@/storage-providers/pcloud/pcloud';
import {
  InputCustomEvent,
  IonButton,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSegment,
  IonSegmentButton
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';

type PCloudSettingsProps = {
  remote: RemoteResult;
};

const PCloudSettings = ({ remote }: PCloudSettingsProps) => {
  const { t } = useLingui();
  const [checking, setChecking] = useState(false);
  const syncConf = JSON.parse(remote.config) as PCloudConf;
  const syncStatus = remote.connected;

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

  const deleteRemote = () => {
    // TODO add confirmation
    remotesService.delRemote(remote.id);
  };

  const labelPlacement = platformService.isWideEnough() ? undefined : 'stacked';

  return (
    <IonList>
      <IonListHeader>
        <IonLabel>
          <Trans>PCloud Configuration</Trans>
        </IonLabel>
        <IonButton onClick={deleteRemote}>
          <IonIcon icon={APPICONS.deleteAction}></IonIcon>
        </IonButton>
      </IonListHeader>
      <IonItem>
        <IonLabel slot="start" className="ion-hide-md-down">
          <Trans>Name</Trans>
        </IonLabel>
        <IonInput
          label={labelPlacement ? t`Name` : undefined}
          labelPlacement={labelPlacement}
          onIonChange={e => onChange('name', e)}
          value={remote.name}
        ></IonInput>
      </IonItem>
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
      <IonItem lines="none" disabled={!syncStatus || checking}>
        {!checking && (
          <IonIcon
            slot="start"
            color={syncStatus ? 'success' : 'danger'}
            icon={syncStatus ? APPICONS.ok : APPICONS.ko}
          ></IonIcon>
        )}
      </IonItem>
    </IonList>
  );
};
export default PCloudSettings;
