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
import platformService from '../../../common/services/platform.service';
import { APPICONS } from '../../../constants';
import { syncConfService } from '../../../db/sync-configurations.service';

const PCloudSettings = () => {
  const type = 'pcloud';
  const { t } = useLingui();
  const [checking, setChecking] = useState(false);
  const syncStatus = syncConfService.useCurrentTestStatus(type);
  const syncConf: PCloudConf =
    syncConfService.useCurrentConfig(type) ||
    ({
      serverLocation: 'eu'
    } as PCloudConf);

  const onChange = async (key: keyof PCloudConf, e: InputCustomEvent) => {
    if (key !== 'serverLocation') {
      syncConf[key] = e.detail.value || '';
    } else {
      syncConf.serverLocation = (e.detail.value as 'eu' | 'us') || 'eu';
    }
    syncConfService.setCurrentConfig(syncConf, type);
    if (syncConf.username && syncConf.password) {
      setChecking(true);
      const test = await syncConfService.configure(
        type,
        pcloudClient,
        // don't send full object, want to erase folderid & fileid
        {
          path: syncConf.path,
          username: syncConf.username,
          password: syncConf.password,
          serverLocation: syncConf.serverLocation
        }
      );
      syncConfService.setCurrentTestStatus(test, type);
      setChecking(false);
    }
  };

  const labelPlacement = platformService.isWideEnough() ? undefined : 'stacked';

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
              <Trans>Server</Trans>
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
      </IonCardContent>
    </IonCard>
  );
};
export default PCloudSettings;
