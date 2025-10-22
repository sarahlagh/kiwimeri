import { GET_FOLDER_ROUTE } from '@/common/routes';
import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import notebooksService from '@/db/notebooks.service';
import userSettingsService from '@/db/user-settings.service';
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
              userSettingsService.setShowDevTools(false);
              history.replace(
                GET_FOLDER_ROUTE(notebooksService.getCurrentNotebook())
              );
            }}
          >
            <Trans>Dev Tools Enabled</Trans>
          </IonToggle>
        </IonCardContent>
      </IonCard>

      {!platformService.isRelease() && (
        <>
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Debug</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>(capacitor) platform: {platformService.getPlatform()}</p>
              <p>(ionic) platforms: {JSON.stringify(getPlatforms())}</p>
              <p>is dev: {platformService.isDev() ? 'yes' : 'no'}</p>
              <p>is android: {platformService.isAndroid() ? 'yes' : 'no'}</p>
              <p>is web: {platformService.isWeb() ? 'yes' : 'no'}</p>
              <p>is electron: {platformService.isElectron() ? 'yes' : 'no'}</p>
              <p>is wide: {platformService.isWideEnough() ? 'yes' : 'no'}</p>
              <p>
                sync enabled: {platformService.isSyncEnabled() ? 'yes' : 'no'}
              </p>
              <p>config: {JSON.stringify(appConfig)}</p>
            </IonCardContent>
          </IonCard>
        </>
      )}

      <ConfigCard />

      {!platformService.isDev() && <LogsCard />}
    </>
  );
};
export default DevTools;
