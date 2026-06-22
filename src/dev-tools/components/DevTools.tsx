import GenericExportFileButton from '@/common/buttons/GenericExportFileButton';
import GenericImportFileButton from '@/common/buttons/GenericImportFileButton';
import { GET_FOLDER_ROUTE } from '@/common/routes';
import platformService from '@/common/services/platform.service';
import { appConfig } from '@/config';
import { space } from '@/core/db/store';
import { plt } from '@/core/infra/platform';
import notebooksService from '@/db/notebooks.service';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import {
  getPlatforms,
  IonButtons,
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
import OperationCard from './OperationsCard';
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

      {!plt.isRelease() && (
        <>
          <IonCard>
            <IonButtons>
              <GenericExportFileButton
                fill="clear"
                color={'primary'}
                label={`Export everything`}
                icon={null}
                getFileMime={'application/json'}
                getFileTitle={() => 'full-space-backup.json'}
                getFileContent={async () => {
                  const content = space.getContent();
                  return JSON.stringify(content);
                }}
              />
              <GenericImportFileButton
                label={`Import everything`}
                color={'danger'}
                icon={null}
                onContentRead={async (content: ArrayBuffer) => {
                  const textContent = new TextDecoder().decode(content);
                  space.setContent(JSON.parse(textContent));
                  return { confirm: true };
                }}
              />
            </IonButtons>
          </IonCard>
          <OperationCard />
        </>
      )}
    </>
  );
};
export default DevTools;
