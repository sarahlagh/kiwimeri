import { GET_FOLDER_ROUTE } from '@/common_to_migrate/routes';
import platformService from '@/common_to_migrate/services/platform.service';
import { appConfig } from '@/config';
import { plt } from '@/core/infra/platform';
import notebooksService from '@/domain/collection/notebooks.service';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import {
  getPlatforms,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonToggle
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { useHistory } from 'react-router';
import ConfigCard from './ConfigCard';
import LogsCard from './LogsCard';
import OperationsCard from './OperationsCard';
import QuickRestore from './QuickRestore';

const DevTools = () => {
  const history = useHistory();

  return (
    <>
      <IonCard>
        <IonCardContent>
          <IonToggle
            disabled={!platformService.isRelease()}
            checked={true}
            onIonChange={() => {
              deviceSettings.set('showDevTools', false);
              history.replace(
                GET_FOLDER_ROUTE(notebooksService.getCurrentNotebook())
              );
            }}
          >
            <Trans>Dev Tools Enabled</Trans>
          </IonToggle>
        </IonCardContent>
      </IonCard>

      {!plt.isRelease() && (
        <>
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Debug</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>(capacitor) platform: {plt.getPlatform()}</p>
              <p>(ionic) platforms: {JSON.stringify(getPlatforms())}</p>
              <p>is dev: {plt.isDev() ? 'yes' : 'no'}</p>
              <p>is android: {plt.isAndroid() ? 'yes' : 'no'}</p>
              <p>is web: {plt.isWeb() ? 'yes' : 'no'}</p>
              <p>is electron: {platformService.isElectron() ? 'yes' : 'no'}</p>
              <p>is wide: {platformService.isWideEnough() ? 'yes' : 'no'}</p>
              <p>
                sync enabled: {deviceSettings.isSyncEnabled() ? 'yes' : 'no'}
              </p>
              <p>config: {JSON.stringify(appConfig)}</p>
            </IonCardContent>
          </IonCard>
        </>
      )}

      <ConfigCard />

      <QuickRestore />
      {!plt.isDev() && <LogsCard />}

      {!plt.isRelease() && <OperationsCard />}
    </>
  );
};
export default DevTools;
