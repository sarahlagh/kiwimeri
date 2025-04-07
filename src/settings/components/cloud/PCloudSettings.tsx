import {
  InputCustomEvent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { pcloudClient, PCloudConf } from '@repo/kiwimeri-sync-pcloud';
import { useState } from 'react';
import { APPICONS } from '../../../constants';
import { syncConfigurationsService } from '../../../db/sync-configurations.service';

const PCloudSettings = () => {
  const type = 'pcloud';
  const { t } = useLingui();
  const [checking, setChecking] = useState(false);
  const syncStatus = syncConfigurationsService.useCurrentTestStatus(type);
  console.debug('syncStatus', syncStatus);
  const syncConf: PCloudConf =
    syncConfigurationsService.useCurrentConfig(type) ||
    ({
      serverLocation: 'eu'
    } as PCloudConf);

  const onChange = async (key: keyof PCloudConf, e: InputCustomEvent) => {
    if (key !== 'serverLocation') {
      syncConf[key] = e.detail.value || '';
    } else {
      syncConf.serverLocation = (e.detail.value as 'eu' | 'us') || 'eu';
    }
    syncConfigurationsService.setCurrentConfig(type, syncConf);
    if (syncConf.username && syncConf.password) {
      setChecking(true);
      console.debug('syncConfig ready to test', syncConf);
      const test = await syncConfigurationsService.configure(
        type,
        pcloudClient,
        syncConf
      );
      console.debug('syncConfig tested', test);
      syncConfigurationsService.setCurrentTestStatus(type, test);
      setChecking(false);
    }
  };

  return (
    <IonCard className="primary">
      <IonCardHeader>
        <IonCardTitle>
          <Trans>PCloud</Trans>
        </IonCardTitle>
        <IonCardSubtitle>
          <Trans>Synchronize your collection with your PCloud account</Trans>
        </IonCardSubtitle>
      </IonCardHeader>

      <IonCardContent>
        <IonList>
          <IonItem>
            <IonLabel slot="start">
              <Trans>PCloud Server</Trans>
            </IonLabel>
            <IonSegment
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
            <IonLabel slot="start">
              <Trans>Path</Trans>
            </IonLabel>
            <IonInput
              onIonChange={e => onChange('path', e)}
              placeholder={t`Path inside your drive, leave empty for root`}
              value={syncConf.path}
            ></IonInput>
          </IonItem>
          <IonItem>
            <IonLabel slot="start">
              <Trans>Username</Trans>
            </IonLabel>
            <IonInput
              onIonChange={e => onChange('username', e)}
              placeholder={t`Enter your username`}
              value={syncConf.username}
            ></IonInput>
          </IonItem>
          <IonItem>
            <IonLabel slot="start">
              <Trans>Password</Trans>
            </IonLabel>
            <IonInput
              onIonChange={e => onChange('password', e)}
              placeholder={t`Enter your password`}
              value={syncConf.password}
            >
              <IonInputPasswordToggle slot="end"></IonInputPasswordToggle>
            </IonInput>
          </IonItem>
          <IonItem lines="none" disabled={!syncStatus || checking}>
            <IonLabel>
              <Trans>Connection</Trans>
            </IonLabel>
            {!checking && (
              <IonIcon
                color={syncStatus ? 'success' : 'danger'}
                icon={syncStatus ? APPICONS.ok : APPICONS.ko}
              ></IonIcon>
            )}
          </IonItem>
        </IonList>
      </IonCardContent>
    </IonCard>
  );
};
export default PCloudSettings;
