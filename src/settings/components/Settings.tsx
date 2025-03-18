import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import storageService from '../../db/storage.service';
import userSettingsService from '../../db/user-settings.service';
import ImportExportCollectionSettings from '../storage/ImportExportCollectionSettings';
const Settings = () => {
  return (
    <>
      {/* <FilesystemSyncSettings></FilesystemSyncSettings> */}
      <ImportExportCollectionSettings></ImportExportCollectionSettings>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>
            <Trans>Theme</Trans>
          </IonCardTitle>
        </IonCardHeader>

        <IonCardContent>
          <IonButton
            onClick={() => {
              userSettingsService.setTheme('light');
            }}
          >
            <Trans>Light</Trans>
          </IonButton>
          <IonButton
            onClick={() => {
              userSettingsService.setTheme('dark');
            }}
          >
            <Trans>Dark</Trans>
          </IonButton>
        </IonCardContent>
      </IonCard>

      <IonCard>
        <IonCardHeader>
          <IonCardTitle>
            <Trans>Operations</Trans>
          </IonCardTitle>
        </IonCardHeader>

        <IonCardContent>
          <IonButton
            fill="clear"
            onClick={() => {
              storageService.getStore().setContent([{}, {}]);
            }}
            color="danger"
          >
            <Trans>nuke db</Trans>
          </IonButton>
        </IonCardContent>
      </IonCard>
    </>
  );
};
export default Settings;
